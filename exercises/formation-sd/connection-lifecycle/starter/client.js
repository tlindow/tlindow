// STARTER — type the [STEP] markers. Compare with ../reference/client.js after a draft.

const WebSocket = require('ws');

const BASE_MS = 200;
const CAP_MS = 3200;

function nextBackoffMs(attempt) {
  // [STEP 2 EXERCISE]: exponential backoff. attempt 0 → 200, 1 → 400, 2 → 800, …
  // return Math.min(CAP_MS, BASE_MS * 2 ** attempt)
  // Interview add-on (optional): add jitter so every desk does not redial in lockstep.
  return BASE_MS; // placeholder: no backoff yet
}

function createLifecycleClient(options) {
  const stats = {
    lastSeq: 0,
    seen: new Set(),
    reconnectAttempts: 0,
    backoffSchedule: [],
    reconnectStartedAt: null,
    reconnectMs: null,
    recovered: 0,
    heartbeats: 0,
    heartbeatIntervalMs: options.heartbeatIntervalMs || 500,
    lastHeartbeatAt: 0,
  };

  let ws = null;
  let closedByUser = false;
  let watchdog = null;
  let reconnectTimer = null;

  function applyEvent(event, { fromReplay = false } = {}) {
    if (!event || stats.seen.has(event.seq)) return;
    stats.seen.add(event.seq);
    stats.lastSeq = Math.max(stats.lastSeq, event.seq);
    if (fromReplay) stats.recovered += 1;
    options.onEvent?.(event, { fromReplay });
  }

  function requestCatchup() {
    // [STEP 4 EXERCISE]: fill the gap only — do not fetch a full snapshot.
    // Option A: ws.send(JSON.stringify({ type: 'catchup', since: stats.lastSeq }))
    // Option B: GET `${options.catchupUrl}?since=${stats.lastSeq}` then applyEvent(..., { fromReplay: true })
    // Skip on the first connect (lastSeq === 0) unless you want late-join replay.
  }

  function armWatchdog() {
    clearTimeout(watchdog);
    // [STEP 1 EXERCISE]: if no heartbeat for ~2.5× interval, ws.close() to force a redial.
    // Half-open TCP often skips the `close` event until you write or time out.
  }

  function scheduleReconnect() {
    if (closedByUser) return;
    // [STEP 2 EXERCISE]:
    //   stats.reconnectStartedAt = stats.reconnectStartedAt || Date.now()
    //   const delay = nextBackoffMs(stats.reconnectAttempts)
    //   stats.backoffSchedule.push(delay)
    //   stats.reconnectAttempts += 1
    //   reconnectTimer = setTimeout(connect, delay)
    options.onLog?.('TODO [STEP 2]: reconnect with exponential backoff');
  }

  function connect() {
    ws = new WebSocket(options.url);

    ws.on('open', () => {
      if (stats.reconnectStartedAt && stats.reconnectMs == null) {
        stats.reconnectMs = Date.now() - stats.reconnectStartedAt;
      }
      stats.reconnectAttempts = 0;
      options.onOpen?.();
      requestCatchup();
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.kind === 'hello') {
        stats.heartbeatIntervalMs = msg.heartbeatIntervalMs || stats.heartbeatIntervalMs;
      } else if (msg.kind === 'event') {
        applyEvent(msg.event);
      } else if (msg.kind === 'replay') {
        for (const event of msg.events || []) applyEvent(event, { fromReplay: true });
      } else if (msg.kind === 'heartbeat') {
        stats.heartbeats += 1;
        stats.lastHeartbeatAt = Date.now();
        options.onHeartbeat?.(msg);
        armWatchdog();
      }
    });

    ws.on('close', () => {
      clearTimeout(watchdog);
      if (!closedByUser) scheduleReconnect();
    });
  }

  return {
    connect,
    disconnect() {
      closedByUser = true;
      clearTimeout(watchdog);
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    },
    forceDrop() {
      if (ws) ws.close();
    },
    getStats: () => stats,
    getLastSeq: () => stats.lastSeq,
  };
}

module.exports = { nextBackoffMs, createLifecycleClient, BASE_MS, CAP_MS };
