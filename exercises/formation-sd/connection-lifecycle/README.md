# Lab 2 — Connection Lifecycle

Small Node.js drill: a **last-sale tape** streamed over WebSockets. The server keeps ticking while you drop the socket. Your job is to notice the death, redial with backoff, and fill the hole via monotonic `seq`.

This is the gap after [`../../realtime-deal-room/`](../../realtime-deal-room/): that lab compares transports and *mentions* replay. Here you implement heartbeat + reconnect + catch-up.

> Typing is learning. Work in `starter/`. Use `reference/` only after you have a draft.

---

## What you implement

| Step | File | You type |
| :--- | :--- | :--- |
| **[STEP 1]** | `starter/server.js` + `starter/client.js` | Server heartbeats; client watchdog if they stop |
| **[STEP 2]** | `starter/client.js` | Exponential backoff reconnect (`base * 2^attempt`, cap it) |
| **[STEP 3]** | `starter/server.js` | `GET /events?since=N` **or** WS `{ type: "catchup", since }` |
| **[STEP 4]** | `starter/client.js` | After reconnect, request only `seq > lastSeq` — no full tape resync |

`lib/tape.js` is already done (append-only log + `seq`). Do not rewrite it.

---

## Run

```bash
cd exercises/formation-sd/connection-lifecycle
npm install

npm run sim          # reference server + client — prints metrics
npm run start:ref    # watch reference heartbeats / ticks
npm start            # starter server (TODOs still open)
npm run sim:mine     # same driver against *your* starter (fails until STEPs are done)
```

`npm run sim` is the working path. It should print:

- heartbeat interval
- reconnect time
- missed events recovered
- whether the gap filled without a full snapshot

---

## What to observe

1. Server `seq` keeps climbing while the client is offline — those ticks are the exam question.
2. First reconnect waits ~`baseMs`; a second failure doubles (until `capMs`). Immediate retry is the thundering-herd bug.
3. Catch-up returns only `seq > lastSeq`. If you re-download the whole tape, you have not finished the lab.
4. Half-open connections often skip `onclose`. Heartbeats (app-level JSON here; browsers cannot see protocol ping/pong) are how you notice.

Intervals are **sped up** (heartbeat 500ms, tick 100ms) so a 3s sim is readable. In an interview, say 15–30s heartbeats on a real socket.

---

## Done when

- [ ] `npm run sim` shows reconnect + recovered count on the reference path
- [ ] `npm run sim:mine` passes after you type the STEPs
- [ ] You can explain heartbeat vs backoff vs seq replay as three different jobs
- [ ] [`SOLUTION.md`](./SOLUTION.md) has your tradeoffs (when to snapshot anyway, why jitter)

---

## Protocol (keep this small)

```text
WS  /ws
    → { kind: "hello", heartbeatIntervalMs, currentSeq }
    → { kind: "event", event: { seq, type, payload, ts } }
    → { kind: "heartbeat", ts, seq }
    → { kind: "replay", events: [...] }
    ← { type: "catchup", since }

GET /events?since=N  → { events: [...] }
GET /metrics         → { seq, heartbeatIntervalMs, tickIntervalMs, clients }
GET /health          → { ok, seq }
```
