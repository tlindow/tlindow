# Exercise: Real-Time Syndicated Deal Room

## Scenario

You are building **DealRoom Live**, a collaborative allocation tool used by a
capital markets syndicate desk during the bookbuild for a new bond/loan
issuance. About **10 clients** connect to the same deal session at once:
the lead trader, syndicate desk staff, sales coverage, risk, and compliance.

While the book is being built:

- Traders adjust **allocation amounts** per investor in a shared table.
- The desk head **locks/unlocks rows** while finalizing tranches.
- Everyone sees everyone else's **cursor/row focus** ("who's editing what")
  so two people don't clobber the same investor's allocation.
- The server pushes **live price/spread ticks** and **order book totals**
  (e.g., "$1.2B covered, 3.1x oversubscribed") to all participants as new
  indications of interest arrive from investors.
- Compliance can post a **hold** on the room (e.g., "MNPI review in
  progress") that must reach every client almost instantly.

## Requirements

- **Low latency**: allocation edits, locks, and price ticks should appear
  for other participants with minimal delay — traders are moving real
  money on this data.
- **Bidirectional updates**: clients send edits/lock requests to the
  server; the server both acknowledges those edits *and* independently
  pushes price ticks, order totals, and compliance holds that no client
  requested.
- **Frequent small messages**: cursor/row-focus updates, allocation deltas,
  price ticks, and presence heartbeats, arriving many times per second
  across ~10 participants.
- **Auditability**: every message must be attributable, ordered, and
  survive a brief client reconnect (e.g., a trader's laptop sleeps) without
  desyncing the book.

## Task

Select the best approach to organize communication between clients and the
server for this scenario (choose from options such as **short/long
polling**, **SSE (Server-Sent Events) + REST**, and **WebSockets**; you may
mention other approaches if relevant). Explain your choice and the key
tradeoffs.

In your explanation, consider:

- Latency and whether the approach supports **true bidirectional**
  communication.
- Server/network efficiency (overhead per message, connection costs) at
  ~10 concurrent clients, and how that changes if this scales to many
  simultaneous deal rooms.
- Operational complexity and scalability considerations (load balancers,
  sticky sessions, horizontal scaling of stateful connections).
- Reliability concerns specific to a financial workflow: reconnect
  behavior, message ordering/idempotency for allocation edits, and
  backpressure when price ticks arrive faster than a client can render
  them.

## What's in this exercise

This folder has **three working reference implementations** of the same
deal-room state (allocations, locks, price ticks, presence) so you can
compare the approaches hands-on instead of purely on paper:

```
server/
  shared-state.js      # in-memory deal room model shared by all servers
  polling-server.js    # REST + short polling implementation
  sse-server.js        # SSE (push) + REST (client -> server) implementation
  websocket-server.js  # WebSocket implementation
client/
  index.html           # minimal UI: allocation table, cursor presence, price ticker
  client.js            # transport-selectable client (?transport=polling|sse|ws)
```

Run any one server (see `package.json` scripts) and open the client against
it to see how each transport behaves under the same workload — try opening
several browser tabs to simulate the ~10 concurrent desk participants, and
watch the network tab for message overhead and latency.

Write your answer in `SOLUTION.md` (template provided) once you've formed
an opinion — cite what you observed in the reference implementations if it
changed or confirmed your reasoning.
