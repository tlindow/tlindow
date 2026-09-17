# Solution: Real-Time Syndicated Deal Room

<!--
Fill this in with your answer. Suggested structure below — feel free to
diverge if your reasoning takes a different shape.
-->

## Recommended approach

## Why not short/long polling

## Why not SSE + REST alone

## Why WebSockets (or your chosen approach)

## Tradeoffs considered

- Latency & bidirectionality:
- Server/network efficiency at ~10 clients, and at scale (many deal rooms):
- Operational complexity (load balancing, sticky sessions, horizontal scaling):
- Reliability (reconnect, ordering/idempotency for allocation edits, backpressure on market ticks):

## What running the reference implementations showed me
