# Formation System-Design Track

Ordered hands-on labs mapped to **Formation Client↔Server / server-to-client** prep.
Sequence Labs 1–3 first (transport intuition → connection lifecycle → request contracts).
Queued labs stay stubbed until those three are solid.

> *"As software engineers, typing IS learning. When we type, we embody the code, the software. If we outsource our typing, we outsource our learning."*

This track **does not rewrite** existing labs. Lab 1 and Lab 3 live in their original folders; Lab 2 is new here.

```text
Lab 1  realtime-deal-room/     push vs pull (polling / SSE / WebSockets)
   ↓
Lab 2  connection-lifecycle/   heartbeat, reconnect+backoff, seq catch-up
   ↓
Lab 3  rest-api-trading/       client→server REST, retries, idempotency
   ↓
queued stubs                   storage → cache → backpressure → fan-out → mock interview
```

---

## Lab 1 — Realtime deal room transports

**Folder:** [`../realtime-deal-room/`](../realtime-deal-room/) (existing, do not rewrite)

### Intuition it builds
Push vs pull. Why polling feels laggy, why SSE is a one-way radio, why WebSockets win for bidirectional high-frequency rooms — and what you pay in connection state.

### Formation mapping
Client↔Server / server-to-client: *how does the server get updates to the client?* Interviewers want a justified transport, not a default of “just use WebSockets.”

Typical prompts this lab trains:
- How would ~10 desks see allocation edits and market ticks with low latency?
- When is short polling enough? When do you need SSE? When do you need a socket?
- What is the overhead of HTTP headers vs WebSocket frames?

### How to run
```bash
cd exercises/realtime-deal-room
npm install
npm run compare
```

### Done when
- You can explain polling vs SSE vs WebSockets using the printed metrics (request count, header overhead, latency).
- You can defend a transport for a bidirectional deal room *and* name a case where SSE + REST is the better fit.
- [`SOLUTION.md`](../realtime-deal-room/SOLUTION.md) has your recommendation in your own words.

---

## Lab 2 — Connection lifecycle (this PR)

**Folder:** [`./connection-lifecycle/`](./connection-lifecycle/) (new)

### Intuition it builds
A live socket is not “set and forget.” Connections die (Wi-Fi blip, laptop sleep, half-open TCP). You detect death with **heartbeats**, redial with **exponential backoff**, and fill the hole with a **monotonic `seq`** instead of reloading the whole world.

### Formation mapping
The follow-up after transport choice: *what happens when the client disconnects mid-stream?* This is the reliability half of server-to-client design — the deal-room lab mentions replay; this lab makes you implement it.

Typical prompts this lab trains:
- How do you know a WebSocket is dead if `onclose` never fires?
- Why backoff (and jitter) instead of reconnecting immediately?
- How does the client resume without a full snapshot resync?

### How to run
```bash
cd exercises/formation-sd/connection-lifecycle
npm install
npm run sim          # working reference: prints reconnect / catch-up metrics
npm start            # starter server (your TODOs)
```

Work in `starter/`. Compare against `reference/` only after you have typed a draft.

### Done when
- `npm run sim` prints heartbeat interval, reconnect time, and missed events recovered.
- Your starter client reconnects with backoff and fills the `seq` gap (REST `/events?since=` or WS `catchup`) without replacing the whole tape.
- [`SOLUTION.md`](./connection-lifecycle/SOLUTION.md) records the tradeoffs in your words.

---

## Lab 3 — REST trading API (client → server)

**Folder:** [`../rest-api-trading/`](../rest-api-trading/) (existing, do not rewrite)

### Intuition it builds
The other direction: request/response contracts. Resource URIs, where params live, retries that must not double-submit a buy, and IDOR on order reads.

### Formation mapping
Client↔Server request design (not the push path). After Labs 1–2 you can talk about streams; Lab 3 is “the client called us, the network retried, what is the contract?”

Typical prompts this lab trains:
- `GET` quote vs `POST` order — safety, cacheability, status codes.
- Where does `Idempotency-Key` live, and what store do you need?
- Why `GET /users/{userId}/orders` from a mobile client is an IDOR trap.

### How to run
Open [`exercise_trading_api.md`](../rest-api-trading/exercise_trading_api.md) and [`trading_api_contract.ts`](../rest-api-trading/trading_api_contract.ts). Type the contracts; do not paste.

### Done when
- All five actions have method, path, param placement, and status codes.
- Place-order is idempotent under retry; list-orders does not trust client-supplied user ids blindly.
- You can walk an interviewer through retry + IDOR without notes.

---

## Queued (titles + goals only)

No implementations yet. After Labs 1–3, pick these up in order.

### Lab 4 (queued) — Persistent Storage
- When the in-memory event log is not enough (process restart, multi-instance).
- What belongs in a write-ahead log / DB vs what can stay in a bounded replay buffer.
- How snapshot + seq log lets a client catch up after the buffer has wrapped.

### Lab 5 (queued) — Caching
- What is safe to cache (quotes) vs what must be fresh (working orders, positions).
- TTL, ETag / `If-None-Match`, and where a CDN is allowed to sit.
- Cache invalidation after a write so Lab 3 reads do not lie.

### Lab 6 (queued) — Rate Limiting / Backpressure
- Protecting a hot stream when one slow client or noisy desk floods the socket.
- Token bucket vs leaky bucket vs per-connection in-flight caps.
- What the client sees: `429`, dropped ticks, or a degraded poll fallback.

### Lab 7 (queued) — Multi-service / Fan-out
- One producer (matching / market-data) → many connection servers.
- Pub/sub vs sticky sessions; who owns the `seq`.
- Fan-out on write vs fan-out on read for presence and last-sale.

### Lab 8 (queued) — End-to-end practice interview
- 35–40 minutes: requirements → APIs → architecture → failure modes (Formation 4-step).
- Combine Labs 1–3 in one prompt (live blotter + place order + disconnect).
- Practice owning the tradeoffs out loud before the interviewer asks.

---

## Practice workflow

1. Type Lab 2 starter steps yourself; use `reference/` as an answer key, not a first draft.
2. Keep altitude: transport and lifecycle before UI chrome ([`../outer-loop.md`](../outer-loop.md)).
3. Pair on syntax/TODOs with [`../inner-loop.md`](../inner-loop.md) — hints, not pasted solutions.
