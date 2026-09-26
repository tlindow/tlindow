// REFERENCE — reconnect with backoff + seq catch-up. Read after you type starter/.

const WebSocket = require('ws');

const BASE_MS = 200;
const CAP_MS = 3200;

function nextBackoffMs(attempt) {
  const exp = Math.min(CAP_MS, BASE_MS * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 50);
  return exp + jitter;
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

  async function requestCatchup() {
    if (!stats.lastSeq) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'catchup', since: stats.lastSeq }));
    }

    if (options.catchupUrl) {
      try {
        const res = await fetch(`${options.catchupUrl}?since=${stats.lastSeq}`);
        const data = await res.json();
        for (const event of data.events || []) applyEvent(event, { fromReplay: true });
      } catch (err) {
        options.onLog?.(`catch-up HTTP failed: ${err.message}`);
      }
    }
  }

  function armWatchdog() {
    clearTimeout(watchdog);
    const timeout = stats.heartbeatIntervalMs * 2.5;
    watchdog = setTimeout(() => {
      options.onLog?.(`heartbeat watchdog fired after ${timeout}ms — closing socket`);
      if (ws) ws.close();
    }, timeout);
  }

  function scheduleReconnect() {
    if (closedByUser) return;
    stats.reconnectStartedAt = stats.reconnectStartedAt || Date.now();
    const delay = nextBackoffMs(stats.reconnectAttempts);
    stats.backoffSchedule.push(delay);
    stats.reconnectAttempts += 1;
    options.onLog?.(`reconnect in ${delay}ms (attempt ${stats.reconnectAttempts})`);
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, delay);
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
