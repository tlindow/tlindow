# 🎯 Learning Exercises

This directory contains **personal system-design and craft learning labs**:
hands-on exercises for skill-building. They are not Affirm production work.
They live in this profile repo so they sit alongside the README that covers
engineering management craft. The broader story is on the
[marketing site](https://tlindow.github.io/).

> *"As software engineers, typing IS learning. When we type, we are embodying
> the code, the software. If we outsource our typing, we outsource our
> learning."*

---

## 🧭 Where to Get Started

Choose a learning track below and dive into the respective exercise folder:

| Track | Topic | Focus Areas | Status | Start Here |
| :--- | :--- | :--- | :--- | :--- |
| **`formation-sd/`** | **System design interview phases** (Formation secondary) | Phase A exploration discipline → B API contracts (`rest-api-trading`) → C realtime (deal-room + connection-lifecycle) → queued D storage / E scaling / F failure modes | 🟢 Ready (A–C) | [`exercises/formation-sd/README.md`](./formation-sd/README.md) |
| **`proto-learning/`** | **Protobuf & gRPC B2B Settlements** | Precision money structures, proto3 enums, `oneof` polymorphic bank payout rails, repeated fee items, streaming RPCs | 🟢 Ready | [`exercises/proto-learning/README.md`](./proto-learning/README.md) |
| **`nextjs-learning/`** | **Next.js App Router: Ledger & Streaming Architecture** | RSC vs client boundaries, Suspense streaming, Server Actions, cache invalidation, parallel/intercepting routes | 🟢 Ready | [`exercises/nextjs-learning/README.md`](./nextjs-learning/README.md) |
| **`realtime-deal-room/`** | **Real-Time Collaboration Transport Design** | Short/long polling vs SSE vs WebSockets for a live syndicated bookbuild deal room (~10 concurrent desk participants) | 🟢 Ready | [`exercises/realtime-deal-room/README.md`](./realtime-deal-room/README.md) |
| **`rest-api-trading/`** | **REST API Design: Stock Trading & Orders** | HTTP methods, resource URI hierarchies, param placement (path/query/body), idempotency keys, IDOR prevention, precision money | 🟢 Ready | [`exercises/rest-api-trading/README.md`](./rest-api-trading/README.md) |

---

## 🛠️ How Exercises Are Structured

Each exercise track lives in its own subdirectory and contains:
1. **`README.md`**: Problem background, learning goals, and step-by-step breakdown.
2. **Starter / Exercise File(s)** (e.g. `.proto`, `.ts`, `.js`, `.go`): The
   interactive code challenge with progressive steps (`[STEP X EXERCISE]`),
   inline guidance, or (for `realtime-deal-room/` and
   `formation-sd/connection-lifecycle/`) working reference implementations to
   compare hands-on.

The **`formation-sd/`** hub is mapped to **interview phases** (Requirements →
APIs → Architecture → Bottlenecks), with Formation Client↔Server modules as a
secondary column. Phase A is a new timed written lab
(`formation-sd/exploration-discipline/`). Phases B and C **link**
`rest-api-trading/` and `realtime-deal-room/` (plus `connection-lifecycle/`)
without rewriting those folders. D–F are queued stubs.

### Recommended Learning Workflow
1. Open the exercise file in your editor.
2. Work through the challenges step-by-step, typing out schemas or implementations.
3. Review and reflect on the architectural trade-offs (data types, serialization, wire performance, API contracts, latency/consistency tradeoffs).

---

## 🤖 Two-Agent Practice Workflow

Exercises in this directory are supported by two distinct agent workflows:
- [`inner-loop.md`](./inner-loop.md) — **Code Progress Partner**: Operates pre-push locally. Focuses on typing-is-learning, Socratic unblocking, and inline code hints.
- [`outer-loop.md`](./outer-loop.md) — **Architecture & Altitude Coach**: Chimes in to maintain senior architectural altitude and enforce repeatable system design frameworks; anchors post-push **GitHub Copilot code reviews** on PRs for on-the-go review.
