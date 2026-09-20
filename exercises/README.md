# 🎯 Learning Exercises

This directory contains **hands-on technical exercises, labs, and interactive
tutorials** designed exclusively for personal learning and deep skill-building.
It lives in this profile repo (rather than the personal site repo) so it sits
alongside the README that highlights technical strengths.

> *"As software engineers, typing IS learning. When we type, we are embodying
> the code, the software. If we outsource our typing, we outsource our
> learning."*

---

## 🧭 Where to Get Started

Choose a learning track below and dive into the respective exercise folder:

| Track | Topic | Focus Areas | Status | Start Here |
| :--- | :--- | :--- | :--- | :--- |
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
   inline guidance, or (for `realtime-deal-room/`) working reference
   implementations to compare hands-on.

### Recommended Learning Workflow
1. Open the exercise file in your editor.
2. Work through the challenges step-by-step, typing out schemas or implementations.
3. Review and reflect on the architectural trade-offs (data types, serialization, wire performance, API contracts, latency/consistency tradeoffs).

---

## 🤖 Two-Agent Practice Workflow

Exercises in this directory are supported by two distinct agent workflows:
- [`inner-loop.md`](./inner-loop.md) — **Code Progress Partner**: Operates pre-push locally. Focuses on typing-is-learning, Socratic unblocking, and inline code hints.
- [`outer-loop.md`](./outer-loop.md) — **Architecture & Altitude Coach**: Chimes in to maintain senior architectural altitude and enforce repeatable system design frameworks; anchors post-push **GitHub Copilot code reviews** on PRs for on-the-go review.
