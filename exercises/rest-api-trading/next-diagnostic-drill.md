# Next system design drill: Diagnostic brief

Sheet for the next Formation Diagnostic or peer mock on this lab
(`exercises/rest-api-trading/`). Run it in one sitting. Do not paste a
coached answer.

## Practice frame

The four system design interview phases, in order. Same frame as
[`../outer-loop.md`](../outer-loop.md) and this lab's README:

1. **Requirements** — functional and non-functional. Read-heavy quotes vs write-critical orders.
2. **Core domain and APIs** — entities, REST contracts, and schemas before boxes.
3. **High-level architecture** — gateway, market data, orders, and stores.
4. **Deep dives and bottlenecks** — failure modes, scale, and trade-offs (idempotency, IDOR, volatility).

## GAP Report feed

Score the mock on these understanding gaps. Wording is the trading
exercise TODO list written against the notes in commit `a15f1c3`
(Stock Detail called a read/transition screen; QPS asserted; one Redis
for quotes and idempotency; SSE on failure). Figures below are restated
from those notes. No new metrics.

### 1. Requirements

- **Writes vs reads on Stock Detail.** Swipe-to-buy is a mutating user action (`POST /orders`) that shares the screen with quote reads. List every UI gesture → read or write before designing APIs.
- **Derive napkin QPS (don't assert).** Stated ~200/2000 read and ~20/200 write without a DAU→avg→peak chain. Show `peak ≈ avg × (24/busy_hours)` for quotes and orders separately.

### 2. Core domain and APIs

- **Batch partial success.** Batch GET should usually `200` with per-symbol success/fail, not all-or-nothing `404`. Shape for 3 valid + 2 bad symbols includes `unresolvedSymbols`.
- **IDOR / userId in the path.** Client apps scope from the token (`GET /orders` or `/me/orders`). Cross-user order fetch → `404` (not `403`) to avoid enumeration. Write the client route vs admin `GET /users/{userId}/orders`.
- **Money as DecimalString.** Explain why IEEE-754 fails for prices. Schema is `"185.50"` or integer cents.

### 3. High-level architecture

- **One Redis ≠ two jobs.** Quote cache (read path, TTL/invalidate) and idempotency store (write path, key→response, lock/TTL) are different contracts. Name two stores and what each key looks like.

### 4. Deep dives and bottlenecks

- **Async order acceptance.** Happy path is `201` + `PENDING`/`RECEIVED` while matching runs async. SSE/WebSockets are for live updates, not the failure path for create. Lifecycle: PENDING→SUBMITTED→FILLED.

## Unlock

Open this file, narrate the four phases on the trading API, and mark each gap hit or missed. That mark-up is the GAP Report for a Formation Diagnostic or peer mock.

Still open on the same TODO list: fill Steps 1–6 in `exercise_trading_api.md` from scratch, then re-submit on Formation solo. That solo submit is the real pass.

Craft practice stays tied to Elevating Developer Fintech through portal trust boundaries and beginner educational flows: marketing as engineering leadership, and B2B portals as trust stores.
