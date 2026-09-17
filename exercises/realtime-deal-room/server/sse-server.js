// Approach 2: SSE (Server-Sent Events) for server -> client push,
// combined with plain REST for client -> server edits.
//
// Server push is now immediate (one long-lived HTTP response per client,
// streamed) instead of poll-and-wait, but the client -> server direction
// is still a second, independent channel (ordinary POSTs) — SSE itself is
// one-way.

const express = require('express');
const {
  createDealRoom,
  applyAllocationEdit,
  applyLockToggle,
  applyPresence,
  applyHold,
  tickMarket,
} = require('./shared-state');

const PORT = process.env.PORT || 4002;

const app = express();
app.use(express.json());
app.use(express.static(require('path').join(__dirname, '..', 'client')));

const room = createDealRoom();
const sseClients = new Set(); // response objects currently subscribed

function broadcast(event) {
  const payload = `id: ${event.seq}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

// --- client -> server (still plain REST; SSE has no upstream channel) --
app.post('/allocations/:investor', (req, res) => {
  const event = applyAllocationEdit(room, {
    investor: req.params.investor,
    amount: Number(req.body.amount),
    participantId: req.body.participantId,
  });
  if (event) broadcast(event);
  res.json({ ok: !!event, seq: room.seq });
});

app.post('/allocations/:investor/lock', (req, res) => {
  const event = applyLockToggle(room, {
    investor: req.params.investor,
    participantId: req.body.participantId,
    lock: !!req.body.lock,
  });
  if (event) broadcast(event);
  res.json({ ok: !!event, seq: room.seq });
});

app.post('/presence', (req, res) => {
  const event = applyPresence(room, req.body);
  broadcast(event);
  res.json({ ok: true, seq: room.seq });
});

app.post('/hold', (req, res) => {
  const event = applyHold(room, req.body);
  broadcast(event);
  res.json({ ok: true, seq: room.seq });
});

app.get('/snapshot', (_req, res) => res.json(snapshot()));

// --- server -> client, via SSE ----------------------------------------
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  // support resuming after a dropped connection using Last-Event-ID
  const lastEventId = Number(req.headers['last-event-id'] || req.query.since || 0);
  const missed = room.log.filter((e) => e.seq > lastEventId);
  for (const e of missed) {
    res.write(`id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  }

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function snapshot() {
  return {
    seq: room.seq,
    allocations: room.allocations,
    book: room.book,
    presence: room.presence,
    hold: room.hold,
  };
}

// Background market data feed now reaches every client the instant it
// happens, not on the next poll.
setInterval(() => broadcast(tickMarket(room)), 1500);

app.listen(PORT, () => {
  console.log(`[sse] deal room server on http://localhost:${PORT}`);
  console.log(`[sse] client: http://localhost:${PORT}/index.html?transport=sse`);
});
