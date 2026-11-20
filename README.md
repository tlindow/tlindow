<div align="center">
  <a href="https://lindowlabs.dev/">
    <img src="./assets/lindow-labs-icon.svg" alt="Lindow Labs" width="72" height="72" />
  </a>
  <h1>Lindow Labs</h1>
  <p><strong>Tyler Lindow (@tlindow)</strong> · Engineering Manager, Applied AI · Founder of Tinker</p>

  <p>
    <a href="https://lindowlabs.dev/"><img src="https://img.shields.io/badge/Site-lindowlabs.dev-4F46E5?style=flat-square&logo=google-chrome&logoColor=white" alt="lindowlabs.dev" /></a>
    <a href="https://www.linkedin.com/in/tlindow/"><img src="https://img.shields.io/badge/LinkedIn-Tyler%20Lindow-FACC15?style=flat-square&logo=linkedin&logoColor=000" alt="LinkedIn" /></a>
    <a href="https://github.com/lindow-labs"><img src="https://img.shields.io/badge/Org-lindow--labs-2D5A3D?style=flat-square&logo=github&logoColor=white" alt="lindow-labs org" /></a>
    <a href="./exercises/README.md"><img src="https://img.shields.io/badge/Technical%20Labs-exercises%2F-4ADE80?style=flat-square&logo=git&logoColor=000" alt="Technical Labs" /></a>
    <img src="https://img.shields.io/badge/Typing%20Coverage-10.77%25%20PASS%20(%E2%89%A510%25)-10B981?style=flat-square" alt="Typing Coverage 10.77% PASS" />
  </p>
</div>

<!-- coverage-bar:start -->
```text
█████████░ 89.23% AI · 10.77% hand
```
<!-- coverage-bar:end -->
<sub>Generated from the typing-coverage linter. Regenerate with <code>make coverage-bar</code>.</sub>

---

### 👤 Now

- **Role:** Engineering manager who makes software reliable in production. Founder of Tinker at Lindow Labs.
- **Looking for:** Engineering manager roles in applied AI and fintech, especially forward deployed and solutions engineering teams.
- **Location:** San Diego, CA 📍 · Open to Seattle, SF, LA, NY and Portland
- **Pronouns:** he/him
- **Supports:** 🏳️‍🌈 LGBTQ+ · 👩 Women in Tech · ✊🏾 BIPOC · ♿ Differently Abled

---

### 🛠️ Building: Tinker

Tinker collects the prompts people write across their AI tools in one place and measures how their understanding changes.

- Live on web, Mac and iOS (TestFlight), with Anthropic API tool-use chat over lesson code.
- Its own MCP server plus a Claude Code capture hook feed one reviewable prompt history, with pause and delete controls. Prompt collection launched in beta on Nov 8, 2026.
- Evals set the direction: a single-interaction learner model scored 55.8% on 2,303 cases from a public student dataset, about level with Bayesian Knowledge Tracing and behind stronger baselines, so Tinker was rebuilt as an agent evaluated on tool-call traces across sequences of prompts.

Code lives in the [lindow-labs](https://github.com/lindow-labs) org.

---

### 📈 Before Tinker: Affirm (2019 to 2026)

Grew and led teams of up to 9 engineers across Affirm's merchant and partner platforms.

- Raised Merchant Portal availability from ~99.7% to 99.9% in Q4 2025, with zero Black Friday / Cyber Monday incidents.
- Cut outage detection at higher-transaction merchants from ~1 hour to under 5 minutes with per-merchant dashboards and alerting.
- Unblocked Affirm's launch as QuickBooks Payments' exclusive pay-over-time partner; my team shipped 3 production fixes and the partnership ramped in Q1 2026.

---

### 🧠 How I work

1. **Reliability anchored to the business.** Clear data ownership and domain boundaries, then observability, alerting and on-call that catch problems before customers do.
2. **Evals over opinions.** Measure against real baselines and let the results decide what gets built next.
3. **Capture the why.** Decisions, trade-offs and context belong next to the code, so the next engineer (or agent) inherits the reasoning and not just the diff.
4. **The Embodiment Axiom**  
   > *"As software engineers, typing IS learning. When we type, we embody the code, the software. If we outsource our typing, we outsource our learning."*  
   *Enforced via pre-commit linter ([`scripts/check_typing_coverage.py`](./scripts/check_typing_coverage.py)): commits fail if hand-typed coverage drops below 10%.*

---

### 🧪 Technical Labs (`exercises/`)

Personal system-design and craft labs. Practice, not production work.

- [`proto-learning/`](./exercises/proto-learning/): Protobuf & gRPC B2B settlements, precision money, streaming RPCs
- [`nextjs-learning/`](./exercises/nextjs-learning/): Next.js App Router streaming ledger, RSC boundaries, server actions
- [`realtime-deal-room/`](./exercises/realtime-deal-room/): Polling vs. SSE vs. WebSockets for live syndicated deal rooms
- [`rest-api-trading/`](./exercises/rest-api-trading/): REST stock trading APIs, idempotency keys, IDOR security prevention

---

### 💭 Opinions

```bash
export WORKFLOW="Mac + Cursor + Claude Code"
export AI="Anthropic API • MCP • evals before features"
export HOSTING="Vercel"
export FRONTEND="Next.js • React • TypeScript"
export DATA_WAREHOUSE="Snowflake"
export COMMUNITY="Luma > Meetup"
```
