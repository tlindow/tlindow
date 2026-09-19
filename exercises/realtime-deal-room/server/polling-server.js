// Approach 1: REST + short polling.
//
// Clients POST edits/presence as normal REST calls, and separately GET
// /events?since=<seq> every N ms to discover what changed (including
// server-originated market ticks). This is the naive baseline the
// exercise asks you to weigh against SSE and WebSockets.

const express = require('express');
const {
  createDealRoom,
  applyAllocationEdit,
  applyLockToggle,
  applyPresence,
  applyHold,
  tickMarket,
} = require('./shared-state');

const PORT = process.env.PORT || 4001;
const POLL_INTERVAL_HINT_MS = 1000; // what we tell clients to poll at

const app = express();
app.use(express.json());
app.use(express.static(require('path').join(__dirname, '..', 'client')));

const room = createDealRoom();

// --- client -> server -----------------------------------------------
app.post('/allocations/:investor', (req, res) => {
  const event = applyAllocationEdit(room, {
    investor: req.params.investor,
    amount: Number(req.body.amount),
    participantId: req.body.participantId,
  });
  res.json({ ok: !!event, seq: room.seq });
});

app.post('/allocations/:investor/lock', (req, res) => {
  const event = applyLockToggle(room, {
    investor: req.params.investor,
    participantId: req.body.participantId,
    lock: !!req.body.lock,
  });
  res.json({ ok: !!event, seq: room.seq });
});

app.post('/presence', (req, res) => {
  applyPresence(room, req.body);
  res.json({ ok: true, seq: room.seq });
});

app.post('/hold', (req, res) => {
  applyHold(room, req.body);
  res.json({ ok: true, seq: room.seq });
});

// --- server -> client, via polling ------------------------------------
// Every poll is a brand-new HTTP request/response: new TCP handshake cost
// (unless keep-alive), headers on every call, and up to POLL_INTERVAL_HINT_MS
// of staleness even when nothing "asked" for an update.
app.get('/events', (req, res) => {
  const since = Number(req.query.since || 0);
  const events = room.log.filter((e) => e.seq > since);
  res.json({ events, pollIntervalMs: POLL_INTERVAL_HINT_MS, room: snapshot() });
});

app.get('/snapshot', (_req, res) => res.json(snapshot()));

function snapshot() {
  return {
    seq: room.seq,
    allocations: room.allocations,
    book: room.book,
    presence: room.presence,
    hold: room.hold,
  };
}

// Background market data feed — with polling, these updates just sit in
// the log until a client's next poll happens to land.
setInterval(() => tickMarket(room), 1500);

app.listen(PORT, () => {
  console.log(`[polling] deal room server on http://localhost:${PORT}`);
  console.log(`[polling] client: http://localhost:${PORT}/index.html?transport=polling`);
});
