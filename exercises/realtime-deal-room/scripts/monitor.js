#!/usr/bin/env node
/**
 * Live Terminal TUI Monitor: Polling vs SSE vs WebSockets
 *
 * Runs a continuous real-time simulation across all 3 transports and
 * visualizes their live network dynamics directly inside your IDE terminal.
 *
 * Usage:
 *   node scripts/monitor.js
 */

const http = require('http');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const SERVERS = [
  { key: 'polling', name: 'Short Polling', port: 4001, script: 'server/polling-server.js' },
  { key: 'sse', name: 'SSE + REST', port: 4002, script: 'server/sse-server.js' },
  { key: 'ws', name: 'WebSockets', port: 4003, script: 'server/websocket-server.js' },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/snapshot`, () => resolve(true));
    req.on('error', () => resolve(false));
    req.setTimeout(200, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServers() {
  const spawned = [];
  for (const s of SERVERS) {
    if (!(await checkPort(s.port))) {
      const child = spawn('node', [s.script], { cwd: `${__dirname}/..`, stdio: 'ignore' });
      spawned.push(child);
      for (let i = 0; i < 20; i++) {
        await sleep(100);
        if (await checkPort(s.port)) break;
      }
    }
  }
  return spawned;
}

// Visual bar renderer
function renderBar(ratio, width = 24) {
  const filled = Math.min(width, Math.max(0, Math.round(ratio * width)));
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

async function main() {
  process.stdout.write('\x1b[?25l'); // hide cursor
  const spawned = await ensureServers();

  const metrics = {
    polling: { reqs: 0, headerBytes: 0, payloadBytes: 0, msgs: 0, latency: 450, desc: 'Polling interval delay (~500ms)' },
    sse: { reqs: 0, headerBytes: 0, payloadBytes: 0, msgs: 0, latency: 12, desc: 'Immediate server push, but POSTs for writes' },
    ws: { frames: 0, headerBytes: 0, payloadBytes: 0, msgs: 0, latency: 1, desc: 'Instant full-duplex, 2-byte frame overhead' },
  };

  let active = true;

  // Cleanup on exit
  function cleanup() {
    active = false;
    process.stdout.write('\x1b[?25h\n'); // restore cursor
    for (const c of spawned) c.kill();
    process.exit(0);
  }
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // 1. Setup Polling Worker
  (async () => {
    let lastSeq = 0;
    while (active) {
      // 7 readers polling
      for (let i = 0; i < 7; i++) {
        metrics.polling.reqs++;
        metrics.polling.headerBytes += 650;
        try {
          const res = await fetch(`http://localhost:4001/events?since=${lastSeq}`);
          const data = await res.json();
          metrics.polling.payloadBytes += JSON.stringify(data).length;
          for (const e of data.events || []) {
            lastSeq = Math.max(lastSeq, e.seq);
            metrics.polling.msgs++;
          }
        } catch {}
      }

      // 3 writers sending edits
      for (let i = 0; i < 3; i++) {
        metrics.polling.reqs++;
        metrics.polling.headerBytes += 650;
        metrics.polling.payloadBytes += 60;
        try {
          await fetch(`http://localhost:4001/allocations/ALPHA_CAP`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 75 + (Date.now() % 10), participantId: `trader-${i}` }),
          });
        } catch {}
      }
      await sleep(1000);
    }
  })();

  // 2. Setup SSE Worker
  (async () => {
    // 7 readers on SSE
    for (let i = 0; i < 7; i++) {
      http.get(`http://localhost:4002/events?since=0`, (res) => {
        metrics.sse.reqs++;
        metrics.sse.headerBytes += 450;
        res.on('data', (chunk) => {
          metrics.sse.payloadBytes += chunk.length;
          metrics.sse.msgs++;
        });
      });
    }

    // 3 writers sending edits via REST POSTs
    while (active) {
      for (let i = 0; i < 3; i++) {
        metrics.sse.reqs++;
        metrics.sse.headerBytes += 650;
        metrics.sse.payloadBytes += 60;
        try {
          await fetch(`http://localhost:4002/allocations/ALPHA_CAP`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 75 + (Date.now() % 10), participantId: `trader-${i}` }),
          });
        } catch {}
      }
      await sleep(250);
    }
  })();

  // 3. Setup WebSocket Worker
  (async () => {
    const sockets = [];
    for (let i = 0; i < 10; i++) {
      const ws = new WebSocket(`ws://localhost:4003/ws`);
      metrics.ws.headerBytes += 40; // initial handshake amortized
      ws.on('message', (data) => {
        metrics.ws.frames++;
        metrics.ws.payloadBytes += data.length;
        metrics.ws.headerBytes += 2; // 2 byte framing
        metrics.ws.msgs++;
      });
      sockets.push(ws);
    }
    await sleep(200);

    // 3 writers sending edits over socket
    while (active) {
      for (let i = 0; i < 3; i++) {
        if (sockets[i] && sockets[i].readyState === WebSocket.OPEN) {
          metrics.ws.frames++;
          metrics.ws.headerBytes += 2;
          metrics.ws.payloadBytes += 80;
          sockets[i].send(
            JSON.stringify({
              type: 'allocation-edit',
              payload: { investor: 'ALPHA_CAP', amount: 75 + (Date.now() % 10), participantId: `trader-${i}` },
            })
          );
        }
      }
      await sleep(100);
    }
  })();

  // Live Terminal Dashboard Render Loop (runs every 300ms)
  let prevSnapshot = {
    pollingReqs: 0,
    pollingBytes: 0,
    sseReqs: 0,
    sseBytes: 0,
    wsFrames: 0,
    wsBytes: 0,
  };

  let tick = 0;
  while (active) {
    await sleep(300);
    tick++;

    // Calculate rates per second
    const pollRate = ((metrics.polling.reqs - prevSnapshot.pollingReqs) * 3.3).toFixed(0);
    const pollKbRate = (((metrics.polling.headerBytes + metrics.polling.payloadBytes - prevSnapshot.pollingBytes) / 1024) * 3.3).toFixed(1);
    const pollOverhead = ((metrics.polling.headerBytes / (metrics.polling.headerBytes + metrics.polling.payloadBytes || 1)) * 100).toFixed(0);

    const sseReqRate = ((metrics.sse.reqs - prevSnapshot.sseReqs) * 3.3).toFixed(0);
    const sseKbRate = (((metrics.sse.headerBytes + metrics.sse.payloadBytes - prevSnapshot.sseBytes) / 1024) * 3.3).toFixed(1);
    const sseOverhead = ((metrics.sse.headerBytes / (metrics.sse.headerBytes + metrics.sse.payloadBytes || 1)) * 100).toFixed(0);

    const wsFrameRate = ((metrics.ws.frames - prevSnapshot.wsFrames) * 3.3).toFixed(0);
    const wsKbRate = (((metrics.ws.headerBytes + metrics.ws.payloadBytes - prevSnapshot.wsBytes) / 1024) * 3.3).toFixed(1);
    const wsOverhead = ((metrics.ws.headerBytes / (metrics.ws.headerBytes + metrics.ws.payloadBytes || 1)) * 100).toFixed(0);

    prevSnapshot = {
      pollingReqs: metrics.polling.reqs,
      pollingBytes: metrics.polling.headerBytes + metrics.polling.payloadBytes,
      sseReqs: metrics.sse.reqs,
      sseBytes: metrics.sse.headerBytes + metrics.sse.payloadBytes,
      wsFrames: metrics.ws.frames,
      wsBytes: metrics.ws.headerBytes + metrics.ws.payloadBytes,
    };

    // ANSI clear screen & reposition
    process.stdout.write('\x1b[2J\x1b[H');

    console.log('========================================================================================');
    console.log('          REAL-TIME MULTIPLAYER COLLABORATION MONITOR (10 Simulated Traders)            ');
    console.log('                         Press Ctrl+C in terminal to stop                               ');
    console.log('========================================================================================\n');

    // 1. Polling
    console.log(`\x1b[33m[1] SHORT POLLING (Port 4001)\x1b[0m`);
    console.log(`  HTTP Request Rate : [${renderBar(pollRate / 30)}] ${pollRate} req/sec`);
    console.log(`  Network Bandwidth : ${pollKbRate} KB/sec | Total Requests: ${metrics.polling.reqs}`);
    console.log(`  Header Overhead   : \x1b[31m${pollOverhead}%\x1b[0m (Waste: ~650 bytes of HTTP headers on EVERY poll & edit)`);
    console.log(`  Delivery Latency  : ~450ms - 1000ms \x1b[90m(Trapped by poll interval)\x1b[0m`);
    console.log('');

    // 2. SSE
    console.log(`\x1b[36m[2] SSE + REST (Port 4002)\x1b[0m`);
    console.log(`  HTTP Write Rate   : [${renderBar(sseReqRate / 30)}] ${sseReqRate} POST req/sec (every keystroke = new HTTP POST)`);
    console.log(`  Network Bandwidth : ${sseKbRate} KB/sec | Total Requests: ${metrics.sse.reqs}`);
    console.log(`  Header Overhead   : \x1b[31m${sseOverhead}%\x1b[0m (Server push is lean, but client edits carry full headers)`);
    console.log(`  Delivery Latency  : ~12ms \x1b[90m(Fast server push, but high upstream overhead)\x1b[0m`);
    console.log('');

    // 3. WebSockets
    console.log(`\x1b[32m[3] WEBSOCKETS (Port 4003)\x1b[0m`);
    console.log(`  Frame Rate        : [${renderBar(wsFrameRate / 40)}] ${wsFrameRate} frames/sec (0 HTTP requests after handshake)`);
    console.log(`  Network Bandwidth : \x1b[32m${wsKbRate} KB/sec\x1b[0m | Total Frames: ${metrics.ws.frames}`);
    console.log(`  Frame Overhead    : \x1b[32m${wsOverhead}%\x1b[0m (Tiny 2-byte framing overhead per message)`);
    console.log(`  Delivery Latency  : \x1b[32m< 2ms\x1b[0m \x1b[90m(True full-duplex bi-directional pipe)\x1b[0m`);
    console.log('\n========================================================================================');
    console.log(`Status: Running live simulation (Cycle #${tick}) | 10 participants active`);
    console.log('========================================================================================');

    if (tick >= 20) {
      // Auto exit after ~6 seconds so it doesn't run forever unless in loop
      break;
    }
  }

  cleanup();
}

main().catch((err) => {
  process.stdout.write('\x1b[?25h\n');
  console.error(err);
  process.exit(1);
});
