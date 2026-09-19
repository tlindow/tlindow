#!/usr/bin/env node
/**
 * Live Network Packet Tracer
 *
 * Visualizes real-time client <-> server communication packet-by-packet,
 * showing the cadence, overhead, and latency so you can feel the mechanical
 * difference between Polling, SSE, and WebSockets.
 *
 * Usage:
 *   node scripts/trace.js [polling | sse | ws]
 */

const http = require('http');
const readline = require('readline');
const WebSocket = require('ws');

const transport = process.argv[2] || 'ws';

function formatBytes(bytes) {
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ---------------------------------------------------------------------------
// 1. Polling Tracer
// ---------------------------------------------------------------------------
async function tracePolling() {
  console.clear();
  console.log('\x1b[1m\x1b[33m=== TRACING SHORT POLLING (Port 4001) ===\x1b[0m');
  console.log('Concept: Client must constantly ask "Anything new?" via full HTTP requests.\n');
  console.log('Press \x1b[1m[ENTER]\x1b[0m at any time to simulate Tyler typing an allocation edit!\n');
  console.log('-------------------------------------------------------------------------------');

  let lastSeq = 0;
  let totalReqs = 0;
  let totalHeaderBytes = 0;

  // Listen for Enter key to trigger an edit
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', async () => {
    const editStart = Date.now();
    totalReqs++;
    totalHeaderBytes += 650;
    process.stdout.write(`\n\x1b[35m[YOU TYPED]\x1b[0m Dispatching POST /allocations/ALPHA_CAP ($85M)...\n`);
    process.stdout.write(`  \x1b[90m↳ Cost: 650B HTTP headers + 32B JSON payload\x1b[0m\n`);

    try {
      await fetch('http://localhost:4001/allocations/ALPHA_CAP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 85, participantId: 'tyler' }),
      });
      process.stdout.write(`  \x1b[33m⏳ Edit saved on server, but other traders WON'T see it until their next poll!\x1b[0m\n\n`);
    } catch {
      console.log('  \x1b[31mServer not running. Run: npm run start:polling\x1b[0m');
    }
  });

  // Polling loop
  while (true) {
    totalReqs++;
    totalHeaderBytes += 650;
    const reqStart = Date.now();

    try {
      const res = await fetch(`http://localhost:4001/events?since=${lastSeq}`);
      const data = await res.json();
      const duration = Date.now() - reqStart;
      const count = data.events ? data.events.length : 0;

      if (count > 0) {
        lastSeq = Math.max(...data.events.map((e) => e.seq));
        const evt = data.events[0];
        console.log(
          `\x1b[32m✔ [POLL #${totalReqs}]\x1b[0m \x1b[1mReceived ${count} new event(s)\x1b[0m (${duration}ms round-trip)`
        );
        console.log(`   Event: \x1b[36m${evt.type}\x1b[0m ${JSON.stringify(evt.payload)}`);
        console.log(`   \x1b[90mWire overhead: 650B headers | Data: ~${JSON.stringify(evt).length}B\x1b[0m\n`);
      } else {
        // Empty poll (waste)
        console.log(
          `\x1b[90m○ [POLL #${totalReqs}] GET /events (650B headers) ──> Server: "Nothing new" (${duration}ms) [EMPTY POLL WASTED]\x1b[0m`
        );
      }
    } catch {
      console.log('\x1b[31mWaiting for polling server on http://localhost:4001... (Run: npm run start:polling)\x1b[0m');
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ---------------------------------------------------------------------------
// 2. SSE Tracer
// ---------------------------------------------------------------------------
async function traceSSE() {
  console.clear();
  console.log('\x1b[1m\x1b[36m=== TRACING SSE + REST (Port 4002) ===\x1b[0m');
  console.log('Concept: Server streams down instantly, but client edits require full HTTP POSTs.\n');
  console.log('Press \x1b[1m[ENTER]\x1b[0m at any time to simulate Tyler typing an allocation edit!\n');
  console.log('-------------------------------------------------------------------------------');

  let sseEventCount = 0;
  let postCount = 0;

  // Listen for Enter key to trigger an edit
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', async () => {
    postCount++;
    const editStart = Date.now();
    console.log(`\n\x1b[35m[YOU TYPED]\x1b[0m Sending HTTP POST /allocations/ALPHA_CAP ($85M)...`);
    console.log(`  \x1b[31m↳ SPLIT-BRAIN: SSE cannot send upstream. Forced to open separate HTTP request!\x1b[0m`);
    console.log(`  \x1b[90m↳ Wire overhead: 650B headers on this POST\x1b[0m`);

    try {
      await fetch('http://localhost:4002/allocations/ALPHA_CAP', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 85, participantId: 'tyler' }),
      });
      console.log(`  \x1b[32m✔ Server acknowledged POST in ${Date.now() - editStart}ms. Pushing to SSE stream...\x1b[0m\n`);
    } catch {
      console.log('  \x1b[31mServer not running. Run: npm run start:sse\x1b[0m');
    }
  });

  // Connect SSE stream
  console.log(`\x1b[36mConnecting single persistent downstream HTTP stream: GET /events\x1b[0m`);
  const req = http.get('http://localhost:4002/events?since=0', (res) => {
    console.log(`\x1b[32m✔ SSE Connection Established (HTTP 200 text/event-stream). Hanging connection open.\x1b[0m\n`);

    res.on('data', (chunk) => {
      const text = chunk.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          sseEventCount++;
          try {
            const evt = JSON.parse(line.slice(6));
            console.log(`\x1b[36m⚡ [SSE DOWNSTREAM PUSH #${sseEventCount}]\x1b[0m Instant server event:`);
            console.log(`   Type: \x1b[1m${evt.type}\x1b[0m | Payload: ${JSON.stringify(evt.payload)}`);
            console.log(`   \x1b[90mWire overhead: 0B new headers (streamed on existing connection)\x1b[0m\n`);
          } catch {}
        }
      }
    });
  });

  req.on('error', () => {
    console.log('\x1b[31mWaiting for SSE server on http://localhost:4002... (Run: npm run start:sse)\x1b[0m');
  });
}

// ---------------------------------------------------------------------------
// 3. WebSocket Tracer
// ---------------------------------------------------------------------------
async function traceWS() {
  console.clear();
  console.log('\x1b[1m\x1b[32m=== TRACING WEBSOCKETS (Port 4003) ===\x1b[0m');
  console.log('Concept: Single persistent full-duplex pipe. Zero HTTP headers after connect.\n');
  console.log('Press \x1b[1m[ENTER]\x1b[0m at any time to simulate Tyler typing an allocation edit!\n');
  console.log('-------------------------------------------------------------------------------');

  let ws;
  try {
    ws = new WebSocket('ws://localhost:4003/ws');
  } catch (e) {
    console.log('\x1b[31mServer not running. Run: npm run start:ws\x1b[0m');
    return;
  }

  let frameCount = 0;

  ws.on('open', () => {
    console.log(`\x1b[32m✔ WebSocket Handshake Complete (HTTP 101 Switching Protocols).\x1b[0m`);
    console.log(`\x1b[32m✔ Raw bidirectional TCP tunnel is now ACTIVE.\x1b[0m\n`);
  });

  ws.on('message', (raw) => {
    frameCount++;
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.kind === 'snapshot') {
        console.log(`\x1b[34m📦 [SNAPSHOT RECEIVED]\x1b[0m Initial state loaded (${raw.length} bytes). Ready for action.\n`);
      } else if (msg.kind === 'event') {
        console.log(
          `\x1b[32m⚡ [WS FRAME #${frameCount}]\x1b[0m Received event: \x1b[1m${msg.event.type}\x1b[0m`
        );
        console.log(`   Payload: ${JSON.stringify(msg.event.payload)}`);
        console.log(`   \x1b[90mWire cost: ONLY 2 BYTES framing overhead! (Zero HTTP headers)\x1b[0m\n`);
      }
    } catch {}
  });

  ws.on('error', () => {
    console.log('\x1b[31mWaiting for WebSocket server on ws://localhost:4003/ws... (Run: npm run start:ws)\x1b[0m');
  });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', () => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.log('Socket not open yet.');
      return;
    }

    const payload = {
      type: 'allocation-edit',
      payload: { investor: 'ALPHA_CAP', amount: 85, participantId: 'tyler' },
    };
    const jsonStr = JSON.stringify(payload);

    console.log(`\n\x1b[35m[YOU TYPED]\x1b[0m Sending frame upstream directly over open socket...`);
    console.log(`  \x1b[32m↳ Zero HTTP request! Sent as single 2-byte framed binary packet (${jsonStr.length} bytes).\x1b[0m`);

    ws.send(jsonStr);
  });
}

// ---------------------------------------------------------------------------
// Main Selector
// ---------------------------------------------------------------------------
if (transport === 'polling') tracePolling();
else if (transport === 'sse') traceSSE();
else traceWS();
