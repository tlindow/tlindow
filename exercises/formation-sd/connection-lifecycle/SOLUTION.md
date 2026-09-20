# Solution template — Connection lifecycle

Type your own answers. The reference code is an implementation, not the interview script.

---

## 1. Three jobs, three tools

What problem does each one solve, and what happens if you skip it?

| Tool | Job it does | Failure mode if missing |
| :--- | :--- | :--- |
| Heartbeat | | |
| Exponential backoff (+ jitter) | | |
| Monotonic `seq` catch-up | | |

---

## 2. Why not full snapshot on every reconnect?

When is replaying `events where seq > lastSeq` enough? When do you *force* a snapshot anyway (log wrapped, seq reset, schema change, gap too large)?

```
[YOUR ANSWER]
```

---

## 3. Detecting death

`ws.on('close')` is not enough. Why do half-open TCP connections linger, and what multiple of the heartbeat interval do you wait before you kill the socket?

```
[YOUR ANSWER]
```

---

## 4. Backoff numbers you would say in an interview

Lab values are sped up (`base=200ms`, `cap=3200ms`). What would you propose for a production blotter (base, cap, jitter, max attempts)? Why not reconnect on the next event-loop tick?

```
[YOUR ANSWER]
```

---

## 5. REST catch-up vs WS `catchup` vs snapshot

Compare `GET /events?since=N`, a `catchup` frame on the new socket, and `GET /snapshot`. Which belongs on first connect vs reconnect? How does this relate to Lab 1 (deal room) replay?

```
[YOUR ANSWER]
```

---

## 6. One sentence for Formation / Brex

If the interviewer asks “the client drops mid-stream — now what?”, what is your opening sentence?

```
[YOUR ANSWER]
```
