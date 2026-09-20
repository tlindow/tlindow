# Phase A — Exploration Discipline

Timed **15–20 min** written lab. No server. You type into [`drill.md`](./drill.md).

This is the remediation for the mentor mock recorded in [`../../outer-loop.md`](../../outer-loop.md): the session stalled in exploration — UI minutiae (image buttons, draft-save intervals) and looking to the interviewer for “what next?” Senior bar: **you** name Requirements → Core APIs → Architecture → Bottlenecks from minute one.

> Typing is learning. Fill the `[STEP]` blocks in order. Do not paste a canned design. Do not open `SOLUTION.md` until the timer ends.

---

## Setup

1. Set a phone timer for **15 minutes** (stretch to 20 only if you finish a step early and want a deeper NFR).
2. Open [`drill.md`](./drill.md) full-screen. Close Slack/docs.
3. Suggested split (steal minutes from a later step, never from step 1):
   - **0:00–5:00** — [STEP 1] quantify requirements / NFRs. **No UI.**
   - **5:00–10:00** — [STEP 2] entities + API contracts.
   - **10:00–15:00** — [STEP 3] boxes, then [STEP 4] **one** failure-mode deep dive.
4. After the timer: walk the anti-pattern checklist. Then fill [`SOLUTION.md`](./SOLUTION.md) from memory.

---

## Prompt (same domain family as the mentor mock)

Design a **read-heavy collaborative publishing platform** (Medium-like reader surface, Notion-like authoring). Authors draft and publish posts; millions of readers hit a home feed and post pages. Writes are rare relative to reads.

You are **not** designing a text editor.

---

## Forced order (do not invert)

1. Quantify functional + non-functional requirements. State assumptions. **No buttons, toolbars, debounce, or autosave intervals.**
2. Core entities and API contracts (method, path, what is stored vs returned).
3. Boxes **only after** (1) and (2): gateway, write path, stores, cache/CDN, feed.
4. One bottleneck / failure mode — not a tour of every box.

---

## Anti-pattern checklist (mentor feedback)

Stop and skip the sentence if you catch yourself doing any of these:

| 🚫 Anti-pattern | Why it failed the mock |
| :--- | :--- |
| Image-insertion buttons, icon pickers, markdown WYSIWYG, “how does the toolbar work?” | UI altitude. Interviewer wanted ingestion / blob / sanitization. |
| Draft-save intervals, keystroke debounce, “save every N ms” | Client UX. The system question is idempotent writes + event batching. |
| “What should we do next?” / waiting for the interviewer to name the phase | Senior bar is you driving Requirements → APIs → Architecture → Deep dive. |
| Drawing boxes before numbers (QPS, R:W, SLA, retention) | Architecture without constraints is decoration. |
| Listing every possible store “to be safe” | One justified choice beats a menu. |

---

## Done when

- [ ] You can narrate the 4-step framework **cold**, no notes, in under 60 seconds.
- [ ] `drill.md` has typed numbers and contracts **above** the first box diagram.
- [ ] Checklist above is clean for this run.
- [ ] [`SOLUTION.md`](./SOLUTION.md) has your 60-second opener in your words.

Re-run this lab on a fresh copy of the `[STEP]` blocks until the opener is automatic. Then go to [Phase B](../README.md) (`rest-api-trading`).
