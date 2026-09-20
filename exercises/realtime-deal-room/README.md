# Exercise: Real-Time Collaboration Architecture (CoderPad / Excalidraw / DealRoom)

> **Original interview answer:** Choose WebSockets for low-latency bidirectional collaboration.

## 🎯 Learning Objective

Develop a deep, intuitive understanding of real-time client-server communication architectures so you can answer this core system design question by hand with precision:

Within the broader **agent-first financial operations dashboard**, this track is the live coordination layer where operators, analysts, and agents share presence, room state, escalations, and streaming updates during active financial workflows.

> **Scenario:**  
> You are building a real-time collaborative app (like **CoderPad**, **Excalidraw**, or a multi-trader **Deal Room**). About **10 participants** collaborate in the same session at once.
>
> **Requirements:**
> 1. **Low latency:** Edits, cursor/presence movements, or presenter changes appear with minimal delay.
> 2. **Bidirectional updates:** Both clients and the server push updates (client edits/cursor deltas $\to$ server; server state broadcasts + live ticks $\to$ all clients).
> 3. **Frequent small messages:** High-frequency small packets (cursor coordinates, keystrokes, lock toggles, heartbeats).
>
> **Task:**  
> Select the best approach to organize client-server communication (weighing **Short Polling**, **SSE + REST**, and **WebSockets**). Explain your choice and the key tradeoffs across:
> - **Latency & Bidirectionality**
> - **Network & Server Overhead** (header cost vs frame overhead for frequent small messages)
> - **Operational Complexity & Scaling** (load balancers, sticky sessions, horizontal scaling)
> - **Reliability & Failure Recovery** (reconnection behavior, message ordering, backpressure)

---

## 🔬 Hands-on Lab: 3 Working Architectures in One Repo

This directory provides three working reference servers sharing the identical in-memory state model ([`server/shared-state.js`](./server/shared-state.js)):

1. **Short Polling** ([`server/polling-server.js`](./server/polling-server.js)) — port `4001`
2. **SSE + REST** ([`server/sse-server.js`](./server/sse-server.js)) — port `4002`
3. **WebSockets** ([`server/websocket-server.js`](./server/websocket-server.js)) — port `4003`

---

## ⚡ Run the Benchmark Directly from the IDE

You do not need to open a browser or switch windows. You can benchmark all three transports with **10 simulated concurrent participants** (3 active writers generating 10 edits/sec, 7 readers receiving broadcasts) directly inside your IDE terminal:

```bash
cd exercises/realtime-deal-room
npm run compare
```

Or test any single transport individually:
```bash
npm run sim:polling   # Test short polling overhead & latency
npm run sim:sse       # Test SSE push + REST POST overhead
npm run sim:ws        # Test WebSocket persistent full-duplex framing
```

### What to Observe in the Terminal Output

Look closely at the metrics table printed by the simulator:
- **HTTP Request Count:** How many HTTP requests does Polling or SSE make vs WebSockets (0 after handshake)?
- **Header Overhead Ratio:** Notice that Polling and SSE burn **80%–90%** of their total bandwidth purely on repeated HTTP headers (~600 bytes per request) carrying tiny 30-byte payloads. WebSockets drops framing overhead to **2–6 bytes** per message.
- **Delivery Latency:** Notice how polling delays message delivery until the next polling tick, while WebSockets delivers updates immediately.
- **Reconnect / Replay:** Observe how all transports rely on a monotonic sequence counter (`seq`) so disconnected clients can fetch missed events without reloading the entire room.

---

## 📝 Your Deliverable

Draft your comprehensive architectural recommendation and tradeoffs in [`SOLUTION.md`](./SOLUTION.md) so you can synthesize and communicate your decision clearly.
