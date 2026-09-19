// DealRoom Live — Interactive Client with Live Telemetry
const params = new URLSearchParams(location.search);
const transport = params.get('transport') || (location.port === '4001' ? 'polling' : location.port === '4002' ? 'sse' : 'ws');
const participantId = 'user-' + Math.random().toString(36).slice(2, 7);
const name = 'Trader ' + participantId.slice(-3);

// Highlight current transport navigation
document.getElementById('transport-badge').textContent = transport;
document.getElementById('transport-badge').className = `badge badge-${transport}`;
if (document.getElementById(`btn-nav-${transport}`)) {
  document.getElementById(`btn-nav-${transport}`).classList.add('active');
}

let lastSeq = 0;
let currentRoom = null;

// Telemetry State
const telemetry = {
  httpCount: 0,
  wsFrames: 0,
  headerBytes: 0,
  payloadBytes: 0,
  eventsCount: 0,
  pendingActions: new Map(), // actionKey -> sentAt
};

let prevHttpCount = 0;
setInterval(() => {
  const reqRate = telemetry.httpCount - prevHttpCount;
  prevHttpCount = telemetry.httpCount;

  document.getElementById('hud-http-count').textContent = transport === 'ws' ? `${telemetry.wsFrames} frames` : telemetry.httpCount;
  document.getElementById('hud-http-rate').textContent = transport === 'ws' ? '0 HTTP reqs (socket)' : `${reqRate} req/sec`;

  const totalBytes = telemetry.headerBytes + telemetry.payloadBytes;
  const wastePct = totalBytes > 0 ? ((telemetry.headerBytes / totalBytes) * 100).toFixed(0) : '0';
  document.getElementById('hud-header-waste').textContent = `${(telemetry.headerBytes / 1024).toFixed(1)} KB`;
  document.getElementById('hud-overhead-pct').textContent = `${wastePct}% wire is headers`;

  document.getElementById('hud-event-count').textContent = telemetry.eventsCount;
  document.getElementById('hud-seq-info').textContent = `Room Seq: ${lastSeq}`;
}, 500);

function trackHttp(url, method, bodyStr = '') {
  telemetry.httpCount++;
  telemetry.headerBytes += 650; // standard request + response header cost
  if (bodyStr) telemetry.payloadBytes += bodyStr.length;
}

function renderSnapshot(snap) {
  if (!snap) return;
  currentRoom = snap;
  lastSeq = snap.seq;
  document.getElementById('covered').textContent = snap.book?.totalCovered ?? 0;
  document.getElementById('oversub').textContent = snap.book?.oversubscription ?? 0;
  document.getElementById('spread').textContent = snap.book?.spreadBps ?? 0;

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

    const statusText = row.lockedBy
      ? (row.lockedBy === participantId ? '🔒 Locked by you' : `🔒 Locked by ${row.lockedBy}`)
      : '🟢 Open';

    tr.innerHTML = `
      <td><strong>${investor}</strong></td>
      <td>$${row.amount}M</td>
      <td><span style="font-size: 0.8rem; color: ${row.lockedBy ? '#fbbf24' : '#4ade80'}">${statusText}</span></td>
      <td class="row-actions">
        <button class="btn-small" onclick="modifyAllocation('${investor}', ${row.amount + 5})">+5M</button>
        <button class="btn-small" onclick="modifyAllocation('${investor}', ${Math.max(0, row.amount - 5)})">-5M</button>
        <button class="btn-small ${row.lockedBy ? 'btn-lock' : ''}" onclick="toggleLock('${investor}', ${!row.lockedBy})">
          ${row.lockedBy ? 'Unlock' : 'Lock'}
        </button>
      </td>
    `;
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
  telemetry.eventsCount++;
  lastSeq = Math.max(lastSeq, evt.seq);
  logLine(`${evt.type} ${JSON.stringify(evt.payload)}`);

  // Calculate delivery latency if this was triggered locally
  const key = `${evt.type}:${evt.payload?.investor}`;
  const sentAt = telemetry.pendingActions.get(key);
  if (sentAt) {
    const lat = Date.now() - sentAt;
    telemetry.pendingActions.delete(key);
    document.getElementById('hud-latency').textContent = `${lat} ms`;
    document.getElementById('hud-latency-desc').textContent = `action $\\to$ broadcast loop`;
  }
}

// ---------------------------------------------------------------------
// Actions callable from UI
// ---------------------------------------------------------------------
window.modifyAllocation = (investor, amount) => {
  telemetry.pendingActions.set(`allocation-updated:${investor}`, Date.now());
  window.sendAction(`/allocations/${investor}`, {
    type: 'allocation-edit',
    investor,
    amount,
    participantId,
    payload: { investor, amount, participantId },
  });
};

window.toggleLock = (investor, lock) => {
  telemetry.pendingActions.set(`lock-changed:${investor}`, Date.now());
  window.sendAction(`/allocations/${investor}/lock`, {
    type: 'lock-toggle',
    investor,
    lock,
    participantId,
    payload: { investor, lock, participantId },
  });
};

// ---------------------------------------------------------------------
// 1. Polling Transport
// ---------------------------------------------------------------------
function startPolling() {
  trackHttp('/snapshot', 'GET');
  fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);

  async function poll() {
    try {
      trackHttp(`/events?since=${lastSeq}`, 'GET');
      const res = await fetch(`/events?since=${lastSeq}`);
      const data = await res.json();
      telemetry.payloadBytes += JSON.stringify(data).length;
      data.events.forEach(applyEvent);
      renderSnapshot(data.room);
      setTimeout(poll, data.pollIntervalMs || 1000);
    } catch {
      setTimeout(poll, 2000);
    }
  }
  poll();

  window.sendAction = (path, body) => {
    const bodyStr = JSON.stringify(body);
    trackHttp(path, 'POST', bodyStr);
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });
  };
}

// ---------------------------------------------------------------------
// 2. SSE Transport
// ---------------------------------------------------------------------
function startSSE() {
  trackHttp('/snapshot', 'GET');
  fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);

  trackHttp(`/events?since=${lastSeq}`, 'GET');
  const es = new EventSource(`/events?since=${lastSeq}`);

  es.onmessage = (msg) => {
    telemetry.payloadBytes += msg.data.length;
    const evt = JSON.parse(msg.data);
    applyEvent(evt);
    fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);
  };

  es.onerror = () => logLine('SSE connection error — auto-reconnecting');

  window.sendAction = (path, body) => {
    // SSE has no upstream channel; client must fire separate HTTP POST
    const bodyStr = JSON.stringify(body);
    trackHttp(path, 'POST', bodyStr);
    fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr,
    });
  };
}

// ---------------------------------------------------------------------
// 3. WebSocket Transport
// ---------------------------------------------------------------------
function startWS() {
  telemetry.headerBytes += 400; // 1 initial HTTP upgrade handshake
  const ws = new WebSocket(`ws://${location.host}/ws`);

  ws.onopen = () => {
    logLine('WebSocket connected (full-duplex)');
    ws.send(JSON.stringify({ type: 'presence', payload: { participantId, name, focusedRow: null } }));
  };

  ws.onmessage = (msg) => {
    telemetry.wsFrames++;
    telemetry.headerBytes += 2; // 2 byte framing
    telemetry.payloadBytes += msg.data.length;

    const data = JSON.parse(msg.data);
    if (data.kind === 'snapshot') {
      renderSnapshot(data.snapshot);
    } else if (data.kind === 'event') {
      applyEvent(data.event);
      // Fast optimistic update from snapshot if provided, or fetch
      fetch('/snapshot').then((r) => r.json()).then(renderSnapshot);
    } else if (data.kind === 'replay') {
      data.events.forEach(applyEvent);
    }
  };

  ws.onclose = () => {
    logLine('WS disconnected — reconnecting with resync');
    setTimeout(startWS, 1000);
  };

  window.sendAction = (_path, body) => {
    telemetry.wsFrames++;
    telemetry.headerBytes += 2;
    const frame = JSON.stringify(body);
    telemetry.payloadBytes += frame.length;
    ws.send(frame);
  };
}

// ---------------------------------------------------------------------
// Background Multi-User Simulator (Toggle in UI)
// ---------------------------------------------------------------------
let simTimer = null;
document.getElementById('sim-traders-toggle')?.addEventListener('change', (e) => {
  if (e.target.checked) {
    simTimer = setInterval(() => {
      const investors = ['ALPHA_CAP', 'BRAVO_AM', 'Northbridge Capital', 'Silverline Pension'];
      const inv = investors[Math.floor(Math.random() * investors.length)];
      const amount = 50 + Math.floor(Math.random() * 45);
      window.sendAction(`/allocations/${inv}`, {
        type: 'allocation-edit',
        investor: inv,
        amount,
        participantId: `bot-${Math.floor(Math.random() * 3)}`,
        payload: { investor: inv, amount, participantId: `bot-${Math.floor(Math.random() * 3)}` },
      });
    }, 400);
  } else {
    clearInterval(simTimer);
  }
});

// Initialize chosen transport
if (transport === 'polling') startPolling();
else if (transport === 'sse') startSSE();
else startWS();
