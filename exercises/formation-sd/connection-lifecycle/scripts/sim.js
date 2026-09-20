#!/usr/bin/env node
/**
 * Connection-lifecycle driver.
 * Default target is reference/ (always runnable). --target=starter is your draft.
 *
 * Prints: heartbeat interval, reconnect time, missed events recovered.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 4100);
const useStarter = process.argv.includes('--target=starter');
const target = useStarter ? 'starter' : 'reference';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PORT}${urlPath}`, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(800, () => {
      req.destroy();
      reject(new Error(`timeout ${urlPath}`));
    });
  });
}

async function waitForHealth(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const { data } = await getJson('/health');
      if (data.ok) return;
    } catch {
      // still binding
    }
    await sleep(50);
  }
  throw new Error(`server on :${PORT} never became healthy`);
}

async function main() {
  const { createLifecycleClient } = require(path.join(ROOT, target, 'client.js'));
  const child = spawn(process.execPath, [path.join(ROOT, target, 'server.js')], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  child.stdout.on('data', (b) => { serverLog += b.toString(); });
  child.stderr.on('data', (b) => { serverLog += b.toString(); });

  const shutdown = () => {
    try { child.kill('SIGTERM'); } catch { /* already gone */ }
  };
  process.on('exit', shutdown);

  try {
    await waitForHealth();
    const metrics = (await getJson('/metrics')).data;

    const client = createLifecycleClient({
      url: `ws://127.0.0.1:${PORT}/ws`,
      catchupUrl: `http://127.0.0.1:${PORT}/events`,
      heartbeatIntervalMs: metrics.heartbeatIntervalMs,
    });

    client.connect();

    const t0 = Date.now();
    while (client.getLastSeq() < 8 && Date.now() - t0 < 2500) {
      await sleep(40);
    }
    const dropSeq = client.getLastSeq();
    if (dropSeq < 1) {
      throw new Error('client never received ticks — is the server broadcasting?');
    }

    const dropAt = Date.now();
    client.forceDrop();
    await sleep(700); // tape keeps moving while we are "in a tunnel"
    const seqWhileDown = (await getJson('/metrics')).data.seq;
    const missedExpected = Math.max(0, seqWhileDown - dropSeq);

    const t1 = Date.now();
    while (Date.now() - t1 < 3500) {
      const s = client.getStats();
      if (s.reconnectMs != null && s.lastSeq >= seqWhileDown) break;
      await sleep(40);
    }

    const stats = client.getStats();
    const serverAfter = (await getJson('/metrics')).data;
    let restCatchup = { status: 0, count: 0 };
    try {
      const { status, data } = await getJson(`/events?since=${dropSeq}`);
      restCatchup = { status, count: (data.events || []).length };
    } catch {
      restCatchup = { status: 0, count: 0 };
    }

    client.disconnect();
    await sleep(80);

    const recovered = stats.recovered;
    const reconnectMs = stats.reconnectMs;
    const gapFilled = stats.lastSeq >= seqWhileDown && recovered > 0;

    console.log('');
    console.log('================================================================');
    console.log(`  CONNECTION LIFECYCLE  (${target})`);
    console.log('================================================================');
    console.log(`  Heartbeat interval:       ${serverAfter.heartbeatIntervalMs} ms`);
    console.log(`  Tick interval:            ${serverAfter.tickIntervalMs} ms`);
    console.log(`  Heartbeats observed:      ${stats.heartbeats}`);
    console.log(`  Disconnect at seq:        ${dropSeq}`);
    console.log(`  Server seq while down:    ${seqWhileDown}  (expected miss ~${missedExpected})`);
    console.log(`  Reconnect attempts:       ${stats.backoffSchedule.length}`);
    console.log(`  Backoff schedule:         ${stats.backoffSchedule.join(' → ') || '(none)'}`);
    console.log(`  Reconnect time:           ${reconnectMs == null ? 'DID NOT RECONNECT' : `${reconnectMs} ms`}`);
    console.log(`  Missed events recovered:  ${recovered}`);
    console.log(`  REST /events?since=:      HTTP ${restCatchup.status || 'n/a'}  (${restCatchup.count} events)`);
    console.log(`  Client seq after catch-up: ${stats.lastSeq}`);
    console.log(`  Server seq now:           ${serverAfter.seq}`);
    console.log(`  Gap filled (no snapshot): ${gapFilled ? 'YES' : 'NO'}`);
    console.log(`  Forced offline window:    ${Date.now() - dropAt} ms (drop → metric snapshot)`);
    console.log('================================================================');
    if (serverLog.trim()) {
      console.log('  server:', serverLog.trim().split('\n').join('\n           '));
    }
    console.log('');

    const pass = gapFilled && reconnectMs != null && restCatchup.status === 200;
    if (!pass) {
      console.log('  RESULT: NOT YET  — implement starter [STEP] markers, or run `npm run sim` for the reference.');
      console.log('');
      process.exitCode = 1;
    } else {
      console.log('  RESULT: PASS  — heartbeat + backoff reconnect + seq catch-up.');
      console.log('');
      process.exitCode = 0;
    }
  } finally {
    shutdown();
  }
}

main().catch((err) => {
  console.error('sim error:', err);
  process.exit(1);
});
