// STARTER — type the [STEP] markers. Compare with ../reference/server.js after a draft.
// Last-sale tape over WebSockets. Ticks already broadcast. Heartbeat + catch-up are yours.

const http = require('http');
const { WebSocketServer } = require('ws');
const { createTape, appendTick, eventsSince, randomSale } = require('../lib/tape');

const PORT = Number(process.env.PORT || 4100);
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS || 500);
const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS || 100);

const tape = createTape();
const clients = new Set();

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg) {
  const raw = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) ws.send(raw);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, seq: tape.seq }));
    return;
  }

  if (url.pathname === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      seq: tape.seq,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      tickIntervalMs: TICK_INTERVAL_MS,
      clients: clients.size,
    }));
    return;
  }

  // [STEP 3 EXERCISE]: Catch-up so a reconnecting client fills seq gaps.
  // Parse ?since=N and return JSON { events: eventsSince(tape, since) }.
  // Hint: this is the REST twin of the WS `catchup` frame below — implement at least one.
  if (url.pathname === '/events') {
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'TODO [STEP 3]: return eventsSince(tape, url.searchParams.get("since"))',
    }));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  clients.add(ws);
  send(ws, {
    kind: 'hello',
    heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
    currentSeq: tape.seq,
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    // [STEP 3 EXERCISE]: WS replay path (same payload as GET /events).
    if (msg.type === 'catchup') {
      // TODO: send(ws, { kind: 'replay', events: eventsSince(tape, msg.since) })
      return;
    }
  });

  ws.on('close', () => clients.delete(ws));
});

setInterval(() => {
  broadcast({ kind: 'event', event: appendTick(tape, randomSale()) });
}, TICK_INTERVAL_MS);

// [STEP 1 EXERCISE]: Application-level heartbeats.
// Browsers cannot see WebSocket ping/pong, so send JSON on an interval:
//   broadcast({ kind: 'heartbeat', ts: Date.now(), seq: tape.seq })
// Use HEARTBEAT_INTERVAL_MS. Half-open sockets stay "open" without this.
// TODO: start the heartbeat timer.

server.listen(PORT, () => {
  console.log(`[lifecycle] starter server http://localhost:${PORT}  (heartbeats/catch-up still TODO)`);
});
