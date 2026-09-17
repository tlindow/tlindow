// Transport-selectable client. Pick with ?transport=polling|sse|ws
// (defaults to whatever the running server implies via its default port).
const params = new URLSearchParams(location.search);
const transport = params.get('transport') || 'ws';
const participantId = 'user-' + Math.random().toString(36).slice(2, 7);
const name = 'Trader ' + participantId.slice(-3);

document.getElementById('transport-badge').textContent = transport;

let lastSeq = 0;

function renderSnapshot(snap) {
  lastSeq = snap.seq;
  document.getElementById('covered').textContent = snap.book.totalCovered;
  document.getElementById('oversub').textContent = snap.book.oversubscription;
  document.getElementById('spread').textContent = snap.book.spreadBps;

  const holdEl = document.getElementById('hold');
  if (snap.hold) {
    holdEl.style.display = 'block';
    holdEl.textContent = `⚠ COMPLIANCE HOLD: ${snap.hold.reason}`;
  } else {
    holdEl.style.display = 'none';
  }

  const rows = document.getElementById('rows');
  rows.innerHTML = '';
  for (const [investor, row] of Object.entries(snap.allocations)) {
    const tr = document.createElement('tr');
    if (row.lockedBy) tr.classList.add('locked');
    tr.innerHTML = `<td>${investor}</td><td>${row.amount}</td><td>${row.lockedBy || ''}</td>`;
    rows.appendChild(tr);
  }

  const presence = document.getElementById('presence');
  presence.innerHTML = Object.values(snap.presence)
    .map((p) => `<span>${p.name}${p.focusedRow ? ' → ' + p.focusedRow : ''}</span>`)
    .join('');
}

function logLine(text) {
  const log = document.getElementById('log');
  const div = document.createElement('div');
  div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  log.prepend(div);
}

function applyEvent(evt) {
  lastSeq = Math.max(lastSeq, evt.seq);
  logLine(`${evt.type} ${JSON.stringify(evt.payload)}`);
}

// ---------------------------------------------------------------------
// Polling transport
// ---------------------------------------------------------------------
function startPolling() {
  const base = '';
  fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);

  async function poll() {
    try {
      const res = await fetch(`/events?since=${lastSeq}`);
      const data = await res.json();
      data.events.forEach(applyEvent);
      renderSnapshot(data.room);
      setTimeout(poll, data.pollIntervalMs);
    } catch (e) {
      setTimeout(poll, 2000); // naive backoff on failure
    }
  }
  poll();

  window.sendAction = (path, body) =>
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------
// SSE transport
// ---------------------------------------------------------------------
function startSSE() {
  fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);

  const es = new EventSource(`/events?since=${lastSeq}`);
  es.onmessage = (msg) => {
    const evt = JSON.parse(msg.data);
    applyEvent(evt);
    fetch('/snapshot').then((r) => r.json()).then(renderSnapshot); // simplistic re-render
  };
  es.onerror = () => logLine('SSE connection error — browser will auto-reconnect');

  window.sendAction = (path, body) =>
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ---------------------------------------------------------------------
// WebSocket transport
// ---------------------------------------------------------------------
function startWS() {
  const ws = new WebSocket(`ws://${location.host}/ws`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'presence', payload: { participantId, name, focusedRow: null } }));
  };

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.kind === 'snapshot') {
      renderSnapshot(data.snapshot);
    } else if (data.kind === 'event') {
      applyEvent(data.event);
      fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);
    } else if (data.kind === 'replay') {
      data.events.forEach(applyEvent);
    }
  };

  ws.onclose = () => {
    logLine('WS closed — reconnecting with resync in 1s');
    setTimeout(startWS, 1000);
  };

  window.sendAction = (_path, body) => {
    // path is unused for ws; msg type is inferred by caller via body.type
    ws.send(JSON.stringify(body));
  };
}

if (transport === 'polling') startPolling();
else if (transport === 'sse') startSSE();
else startWS();
