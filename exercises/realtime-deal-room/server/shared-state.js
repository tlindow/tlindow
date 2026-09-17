// Shared in-memory "deal room" model used by all three transport
// implementations, so the only variable being compared is the transport.
//
// Not production-grade persistence (no DB, no auth) — this is a teaching
// scaffold focused purely on the communication layer.

const INVESTORS = [
  'Northbridge Capital',
  'Silverline Pension',
  'Argent Wealth',
  'Cascade Insurance',
  'Union Harbor AM',
  'Meridian Endowment',
];

function createDealRoom() {
  return {
    // sequence number: every mutation increments this, so clients can
    // detect gaps/out-of-order delivery and request a resync.
    seq: 0,

    // per-investor allocation amount (USD millions) + which row is locked
    // by whom (desk head finalizing a tranche).
    allocations: INVESTORS.reduce((acc, name) => {
      acc[name] = { amount: 0, lockedBy: null };
      return acc;
    }, {}),

    // live book totals, ticked by a background "market data" simulator.
    book: { totalCovered: 0, oversubscription: 0, spreadBps: 145 },

    // presence: participantId -> { name, focusedRow, lastSeen }
    presence: {},

    // compliance hold banner, null when clear.
    hold: null,

    // append-only log of events for auditability / polling diffs.
    log: [],
  };
}

function appendEvent(room, type, payload) {
  room.seq += 1;
  const event = { seq: room.seq, type, payload, ts: Date.now() };
  room.log.push(event);
  // keep the log bounded for this demo
  if (room.log.length > 500) room.log.shift();
  return event;
}

function applyAllocationEdit(room, { investor, amount, participantId }) {
  const row = room.allocations[investor];
  if (!row) return null;
  if (row.lockedBy && row.lockedBy !== participantId) {
    return appendEvent(room, 'allocation-rejected', {
      investor,
      reason: `locked by ${row.lockedBy}`,
    });
  }
  row.amount = amount;
  return appendEvent(room, 'allocation-updated', { investor, amount, participantId });
}

function applyLockToggle(room, { investor, participantId, lock }) {
  const row = room.allocations[investor];
  if (!row) return null;
  row.lockedBy = lock ? participantId : null;
  return appendEvent(room, 'lock-changed', { investor, lockedBy: row.lockedBy });
}

function applyPresence(room, { participantId, name, focusedRow }) {
  room.presence[participantId] = { name, focusedRow, lastSeen: Date.now() };
  return appendEvent(room, 'presence', { participantId, name, focusedRow });
}

function applyHold(room, { active, reason }) {
  room.hold = active ? { reason, since: Date.now() } : null;
  return appendEvent(room, 'hold-changed', { active, reason });
}

// Simulates investor indications of interest arriving and market moving,
// independent of any client request — this is the "server pushes updates
// nobody asked for" half of the bidirectional requirement.
function tickMarket(room) {
  room.book.totalCovered += Math.round(Math.random() * 40); // $M
  const totalDeal = 1200; // $1.2B deal size, fixed for the exercise
  room.book.oversubscription = +(room.book.totalCovered / totalDeal).toFixed(2);
  room.book.spreadBps += Math.round((Math.random() - 0.5) * 2);
  return appendEvent(room, 'market-tick', { ...room.book });
}

module.exports = {
  INVESTORS,
  createDealRoom,
  appendEvent,
  applyAllocationEdit,
  applyLockToggle,
  applyPresence,
  applyHold,
  tickMarket,
};
