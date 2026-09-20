// Shared last-sale tape. Same idea as deal-room `seq` + bounded log:
// clients ask for "everything after N" instead of the whole book.

function createTape() {
  return { seq: 0, events: [] };
}

function appendTick(tape, payload) {
  tape.seq += 1;
  const event = { seq: tape.seq, type: 'last-sale', payload, ts: Date.now() };
  tape.events.push(event);
  if (tape.events.length > 200) tape.events.shift();
  return event;
}

function eventsSince(tape, since) {
  const n = Number(since) || 0;
  return tape.events.filter((e) => e.seq > n);
}

function randomSale() {
  const priceCents = 14000 + Math.floor(Math.random() * 250);
  return {
    symbol: 'BRX',
    price: (priceCents / 100).toFixed(2),
    qty: (1 + Math.floor(Math.random() * 9)) * 100,
  };
}

module.exports = { createTape, appendTick, eventsSince, randomSale };
