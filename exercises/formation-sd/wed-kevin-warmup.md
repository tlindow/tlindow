# Pre-Wed Kevin warm-up

**When:** Wed Sep 23, 2026 · 4–5pm PDT  
**Session:** Formation Design Drills — Advanced Client/Server with Kevin Farst  
**Tag:** Phase 3 (APIs) with a **forced Requirements opener**  
**This sheet:** sole 20–30 min warm-up. Transfer straight into that hour.

Do **not** start a new lab. Follow the timers. Type only the small blocks here plus the one linked STEP. No UI. No architecture boxes unless Kevin asks.

```text
0:00–10:00   Block 1  Cold-open constraints   (8–10 min)
10:00–25:00  Block 2  API / communication     (12–15 min)
             Stop. Do not open Phases D–F or connection-lifecycle.
```

---

## Block 1 — Cold-open constraints (8–10 min)

**Timer: 8 minutes. Hard stop at 10.**

Use the **STEP 1 gates only** from [`exploration-discipline/drill.md`](./exploration-discipline/drill.md) (1a scope, 1b numbers, 1c consistency). Ignore STEP 2–4. Do not use the publishing-platform prompt in that file.

**Prompt for this warm-up (Client/Server):** ~10 desks in a **live syndicated deal room** (or a live-quotes / multiplayer session — pick one and stick). Edits and ticks must show up fast; the client will drop mid-stream.

Fill 1b-style numbers for **this** domain, then say them out loud:

| Constraint | Your number / call | Say it in one clause |
| :--- | :--- | :--- |
| Participant count | | |
| Read:write (ticks+presence vs edits) | | |
| Latency (p99 desk-to-desk) | | |
| Consistency (what may be stale) | | |
| Failure assumption (disconnect / retry) | | |

```
[YOUR 60-SECOND OPENER — type after you say it]
# “Assumptions: N desks, R:W …, p99 …, stale OK for …, on drop we …”
```

**Done:** you can state R/W ratio, latency, consistency, participant count, and failure assumptions out loud in **under 60 seconds** with no notes. If 1b is still empty, you do not start Block 2 (same gate as the exploration lab).

---

## Block 2 — API / communication tradeoffs (12–15 min)

**Timer: 12 minutes. Optional +5. Hard stop at 15.**

### 2a. Type this reflection (required, ~10 min)

Open **only** Step 6 Q1 in [`../rest-api-trading/exercise_trading_api.md`](../rest-api-trading/exercise_trading_api.md) (the “Market Data Streaming vs REST Polling” question). Type the reflection **there**. Do not do Q2–Q4.

Copy the one-liner you will say to Kevin:

```
[YOUR SENTENCE]
# Why REST polling dies at 50ms ticks; SSE vs WS; where GET /quotes still belongs.
```

### 2b. Transport pick (optional, 5 min — only if Block 1 finished before 8:00)

Skim the metrics takeaway in [`../realtime-deal-room/README.md`](../realtime-deal-room/README.md) (“What to Observe”). If you still have clock: `cd exercises/realtime-deal-room && npm run compare`.

```
[ONE SENTENCE] when WS vs when SSE vs when polling
```

**Done:** you can defend a transport **and** where REST still belongs, without looking at notes.

---

## Walk into the hour

1. Lead with Block 1 numbers (Requirements opener — Formation will force this).
2. Then APIs / communication (Phase 3): Block 2 sentence.
3. If Kevin goes to disconnects, you already named the failure assumption. Do not volunteer UI.
