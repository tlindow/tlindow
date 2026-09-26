// REFERENCE — working heartbeat + REST/WS catch-up. Read after you type starter/.

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

function writeJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/health') {
    writeJson(res, 200, { ok: true, seq: tape.seq });
    return;
  }

  if (url.pathname === '/metrics') {
    writeJson(res, 200, {
      seq: tape.seq,
      heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
      tickIntervalMs: TICK_INTERVAL_MS,
      clients: clients.size,
    });
    return;
  }

  if (url.pathname === '/events') {
    writeJson(res, 200, { events: eventsSince(tape, url.searchParams.get('since')) });
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
    if (msg.type === 'catchup') {
      send(ws, { kind: 'replay', events: eventsSince(tape, msg.since) });
    }
  });

  ws.on('close', () => clients.delete(ws));
});

setInterval(() => {
  broadcast({ kind: 'event', event: appendTick(tape, randomSale()) });
}, TICK_INTERVAL_MS);

setInterval(() => {
  broadcast({ kind: 'heartbeat', ts: Date.now(), seq: tape.seq });
}, HEARTBEAT_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`[lifecycle] reference server http://localhost:${PORT}`);
  console.log(`[lifecycle] heartbeat ${HEARTBEAT_INTERVAL_MS}ms  tick ${TICK_INTERVAL_MS}ms`);
});
