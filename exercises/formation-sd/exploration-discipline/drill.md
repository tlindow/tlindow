# Phase A drill — type your answers in order

Timer: **15–20 minutes**. Do not skip ahead to [STEP 3] boxes.  
Domain: read-heavy collaborative publishing (feed + post page + author publish).  
You are **not** designing a text editor.

---

## [STEP 1 EXERCISE] Requirements & NFRs (minutes 0–5)

**No UI.** If a sentence names a button, cursor, toolbar, or save interval, delete it.

State assumptions out loud (write them). Clarify business constraints; do not ask “how should we build this?”

### 1a. Functional scope (3–5 bullets, in / out)

```
[YOUR ANSWER]
# in:
# out (explicit): editor chrome, presence cursors, …
```

### 1b. Numbers — invent them if the interviewer has not given them

| Quantity | Your number | Why this order of magnitude |
| :--- | :--- | :--- |
| DAU / peak readers | | |
| Read:write ratio | | |
| Read QPS (feed + post GET) | | |
| Write QPS (publish / upload) | | |
| Post body size (p50 / p99) | | |
| Retention / feed window | | |
| Read SLA (p99 GET post) | | |
| Availability target | | |

```
[YOUR ASSUMPTIONS / NOTES]
```

### 1c. One consistency sentence

What must be correct at publish time vs what may be stale on the feed? Read-your-writes for the author?

```
[YOUR ANSWER]
```

**Gate:** if 1b is empty, you do not start STEP 2.

---

## [STEP 2 EXERCISE] Core entities + API contracts (minutes 5–10)

Name 4–6 entities. Then write **three** contracts only (not a full catalog): read post, publish, read feed. Method, path, key params, success / error codes. No boxes yet.

### 2a. Entities

```
[YOUR ANSWER]
# e.g. User, Post, …  (body blob vs metadata row — say where each lives, still no diagram)
```

### 2b. `GET` post (read path — this is the hot path)

```http
# [STEP 2b] type the contract
HTTP Method:
Path:
Params:
Success:
Errors:
# cacheable? what header / key?
```

### 2c. Publish (write path — rare, must not double-publish on retry)

```http
# [STEP 2c]
HTTP Method:
Path:
Headers:   # idempotency?
Body:
Success:
Errors:
```

### 2d. Home feed page

```http
# [STEP 2d]
HTTP Method:
Path:
Params:    # cursor? limit?
Success:
# fan-out-on-write vs fan-out-on-read — one sentence, still no boxes
```

**Gate:** if any of 2b–2d is still “we’ll figure out the API later,” you do not start STEP 3.

---

## [STEP 3 EXERCISE] High-level architecture (minutes 10–13)

Boxes **now**. Clients → gateway → services → stores. Separate **blob** (markdown / images) from **metadata** (author, title, pointers). Show the read-heavy cache/CDN. Do not add an “editor service.”

```
[YOUR DIAGRAM — ascii is enough]

[YOUR 5-LINE NARRATION]
# 1. publish write path
# 2. where the body lives
# 3. how a GET post is served at p99
# 4. how the feed is built (write vs read fan-out)
# 5. what you explicitly did not build
```

---

## [STEP 4 EXERCISE] One failure-mode deep dive (minutes 13–15/20)

Pick **one**. Go deep. Do not tour every box.

Options (choose one):

- Publish retry / double-publish (idempotency store, what the client retries)
- Image / asset upload (pre-signed URL, virus scan, not a file-picker widget)
- Feed stampedes after a celebrity publish
- Cache invalidation on edit vs stale-while-revalidate
- Markdown ingest vs storing raw HTML (token cost, XSS)

```
[YOUR PICK]

[YOUR DEEP DIVE]
# failure, detection, mitigation, leftover risk
```

---

## Cold closer (after the timer, still no notes)

Say this out loud, then type it:

```
[YOUR 60-SECOND OPENER]
# “I’ll take this in four steps: requirements, APIs, architecture, one deep dive. Assumptions are …”
```
