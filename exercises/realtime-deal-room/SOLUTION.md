# Solution: Real-Time Collaboration (CoderPad / Excalidraw Scenario)

## Recommended Approach
**WebSockets** is the best choice for this collaborative scenario.

---

## Why Not Short/Long Polling
- **Like texting repeatedly:** Polling is like texting the server every second asking, *"Did anything change? Did anything change?"* Most of those texts come back empty, which wastes network effort.
- **Massive wrapper waste:** Every single poll is a brand-new HTTP request that sends a giant paragraph of formal letterhead (headers) just to ask for a tiny piece of information. It's like shipping a giant cardboard box to deliver a single paperclip.
- **Built-in lag:** Edits don't appear in real time. Participants have to wait until the next polling tick (500ms to 1,000ms) to see another person’s cursor move or stroke, making a collaborative drawing or coding tool feel jerky and lagged.

---

## Why Not SSE (Server-Sent Events) + REST Alone
- **The one-way street problem:** SSE keeps a single connection open so the server can push updates down to everyone instantly without re-dialing. That part works well.
- **The client can't talk back on the same line:** The connection only flows from the server to the client. The browser cannot send data back up through that same pipe.
- **Every keystroke is a new phone call:** In an app like CoderPad or Excalidraw, users are constantly typing and moving cursors. Because SSE can't send data from the client, the browser is forced to make a brand-new HTTP request for every single cursor twitch or edit. This floods the server with hundreds of heavy requests wrapped in bulky headers.

---

## Why WebSockets
- **Like a live phone call:** WebSockets dials the server once, performs an initial handshake, and then leaves the line permanently open for the entire session.
- **True two-way communication:** Both the browser and the server can talk at any millisecond over the same open line without hanging up or redialing.
- **Near-zero overhead:** Once connected, you throw away all the bulky HTTP letterheads. Messages travel with virtually zero wrapping, making it lightning fast and lightweight.
- **Instant updates:** Edits and strokes broadcast immediately to all 10 participants without waiting for polling timers or new request round trips.

---

## Tradeoffs Considered

- **Latency & Direction of Data:**  
  WebSockets provides the lowest latency because the underlying connection is already open. It natively lets both sides talk anytime on a single connection, whereas SSE requires a hybrid setup (SSE down, separate HTTP requests up) and polling introduces artificial waiting cycles.

- **Network & Server Efficiency at ~10 Clients:**  
  With ~10 people typing and moving cursors many times per second, polling and REST would generate hundreds of separate requests per second with massive metadata waste. WebSockets eliminates that repetitive overhead entirely.

- **Connection Management (The Tradeoff):**  
  Unlike regular web requests where you ask and hang up immediately, WebSockets requires the server to keep all 10 connections open in memory at the same time. For ~10 clients in a room, this takes very little server memory and is easily handled.

- **Reliability & Disconnects:**  
  If a user's Wi-Fi drops, the phone call hangs up. The app has to detect that the connection dropped and automatically re-dial to get back into the room.
