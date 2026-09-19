// Approach 3: WebSockets — single full-duplex connection per client used
// for both directions: allocation edits/lock requests/presence flow up,
// market ticks/broadcasts flow down, all on one socket.

const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const {
  createDealRoom,
  applyAllocationEdit,
  applyLockToggle,
  applyPresence,
  applyHold,
  tickMarket,
} = require('./shared-state');

const PORT = process.env.PORT || 4003;

const app = express();
app.use(express.static(require('path').join(__dirname, '..', 'client')));
app.get('/snapshot', (_req, res) => res.json(snapshot()));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const room = createDealRoom();
const clients = new Map(); // ws -> { participantId, lastAckSeq }

function snapshot() {
  return {
    seq: room.seq,
    allocations: room.allocations,
    book: room.book,
    presence: room.presence,
    hold: room.hold,
  };
}

function broadcast(event) {
  const payload = JSON.stringify({ kind: 'event', event });
  for (const ws of clients.keys()) {
    if (ws.readyState === ws.OPEN) ws.send(payload);
  }
}

wss.on('connection', (ws) => {
  clients.set(ws, { participantId: null, lastAckSeq: room.seq });

  // full state on connect (equivalent to the resync every transport needs)
  ws.send(JSON.stringify({ kind: 'snapshot', snapshot: snapshot() }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }

    let event = null;
    switch (msg.type) {
      case 'allocation-edit':
        event = applyAllocationEdit(room, msg.payload);
        break;
      case 'lock-toggle':
        event = applyLockToggle(room, msg.payload);
        break;
      case 'presence':
        clients.get(ws).participantId = msg.payload.participantId;
        event = applyPresence(room, msg.payload);
        break;
      case 'hold':
        event = applyHold(room, msg.payload);
        break;
      case 'resync': {
        // client reconnected and tells us the last seq it saw; we replay
        // the gap instead of re-sending the whole snapshot when possible.
        const since = Number(msg.payload?.since || 0);
        const missed = room.log.filter((e) => e.seq > since);
        ws.send(JSON.stringify({ kind: 'replay', events: missed }));
        return;
      }
      default:
        return;
    }
    if (event) broadcast(event);
  });

  ws.on('close', () => clients.delete(ws));
});

// Background market data feed, pushed on the same socket the client uses
// to send edits — true bidirectional, single connection.
setInterval(() => broadcast(tickMarket(room)), 1500);

server.listen(PORT, () => {
  console.log(`[ws] deal room server on http://localhost:${PORT}`);
  console.log(`[ws] client: http://localhost:${PORT}/index.html?transport=ws`);
});
