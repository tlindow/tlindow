# Exercise: Real-Time Syndicated Deal Room

This exercise now follows the same **progressive, fill-in-the-blanks** style as
`proto-learning`: start from guided scaffolds, complete each step, then compare
against the full JS reference implementations.

## 🎯 Learning Objectives

By the end of this track, you should be able to:

1. Model a real-time deal-room state machine with **ordered, attributable events**.
2. Implement **reconnect + replay** logic for short disconnects.
3. Build a **WebSocket-first** collaboration flow with bidirectional updates.
4. Read and reason about a **Python backend** implementation.
5. Connect a **Next.js + TypeScript** client to the same event model.
6. Explain polling vs SSE vs WebSocket tradeoffs in this finance scenario.

---

## 📝 Exercise Breakdown

### Step 1: Python backend scaffold (fill in blanks)

Open [`exercise_01_python_ws_backend.py`](./exercise_01_python_ws_backend.py)
and complete each `[STEP X EXERCISE]` marker.

- Build room state + append-only event log.
- Add WebSocket join/snapshot behavior.
- Apply allocation/lock/presence/hold commands.
- Implement replay for reconnect (`since` sequence).

### Step 2: Next.js + TypeScript client scaffold (fill in blanks)

Open [`exercise_02_nextjs_typescript_client.tsx`](./exercise_02_nextjs_typescript_client.tsx)
and complete each `[STEP X EXERCISE]` marker.

- Define typed event/snapshot contracts.
- Connect/disconnect WebSocket safely in a Client Component.
- Apply event stream updates + replay handling.
- Send typed room actions to backend.

### Step 3: Compare transport implementations

Use the existing working references in this folder to contrast behavior under the
same workload:

```
server/
  shared-state.js
  polling-server.js
  sse-server.js
  websocket-server.js
client/
  index.html
  client.js
```

Run one server at a time (`npm run polling`, `npm run sse`, `npm run ws`) and
open multiple browser tabs to simulate desk participants.

### Step 4: Write your recommendation

Write your decision in [`SOLUTION.md`](./SOLUTION.md): pick polling vs SSE+REST
vs WebSockets for this deal room and justify the tradeoffs.

---

## Scenario (same domain constraints)

You are building **DealRoom Live** for a syndicate desk where ~10 participants
collaborate in the same issuance book.

- Traders edit allocation amounts per investor.
- Desk staff lock/unlock rows while finalizing tranches.
- Presence/cursor focus prevents edit collisions.
- Server pushes price/spread ticks and order-book totals.
- Compliance can publish room-wide holds that must propagate immediately.

System requirements:

- **Low latency** shared state updates.
- **Bidirectional** communication (client commands + server-originated pushes).
- **Frequent small messages** (focus/heartbeat/tick deltas).
- **Auditability + reconnect safety** (ordered events, replay/idempotency).
