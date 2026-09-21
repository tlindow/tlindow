# sStock Trading REST API

> **TODO [FORMATION LOW 9]:** Title typo: `sStock` → `Stock`.

> **Formation redo — fill order**
>
> Fix UI Detail write (5) → rewrite §1 derived avg/peak (15) → split §3 Redis vs Idempotency-Key + async ACK (10) → 4 bottleneck lines (10) → stub 4 HTTP contracts (10).

## UI

### Watchlist

```text
┌──────────────────────────────────────────────┐
│  PORTFOLIO VALUE                             │
│  $14,250.80  ▲ +$320.15 (+2.3%) Today        │
│  ──────────────────────────────────────────  │
│  [  1D  |  1W  |  1M  |  1Y  |  ALL  ]       │
│                                              │
│  WATCHLIST (Live Tickers)                    │
│  • AAPL   Apple Inc.        $185.50  ▲ +1.2% │
│  • MSFT   Microsoft Corp.   $415.20  ▲ +0.8% │
│  • NVDA   NVIDIA Corp.      $122.40  ▼ -2.1% │
│  • TSLA   Tesla Inc.        $240.10  ▲ +3.4% │
│                                              │
│  [ Home ]    [ Search ]    [ History ]       │
└──────────────────────────────────────────────┘
```

this definitely a read heavy screen, a read-only dashboard of stock tickers, stock price movement, your overall portfolio value and it's overall price movement.

### Stock Detail

```text
┌──────────────────────────────────────────────┐
│  < Back            AAPL - Apple Inc.         │
│  $185.50  ▲ +$2.20 (+1.2%) Today             │
│  Bid: $185.48 (x500)   |   Ask: $185.52 (x300)│
│  Volume: 42.5M Shares  |   Day High: $186.10 │
│  ──────────────────────────────────────────  │
│  ORDER TYPE:  [ Market Order  ▼ ]            │
│  SHARES:      [ 10              ]            │
│  EST. COST:   $1,855.00                      │
│  BUYING POWER AVAILABLE: $5,400.00           │
│                                              │
│         ╔═══════════════════════════╗        │
│         ║     >>> SWIPE TO BUY >>>  ║        │
│         ╚═══════════════════════════╝        │
└──────────────────────────────────────────────┘
```

Another read-only screen, that's really just a transition screen to then getting into some writes

> **TODO [FORMATION HIGH 1]:** Stock Detail is read+write (quote + swipe-to-buy). Name `placeOrder`. The user expects a fast ACK, not necessarily `FILLED`. The write lives on Detail, not missing from History.

### Order History

```text
┌──────────────────────────────────────────────┐
│  ORDER HISTORY                               │
│  ──────────────────────────────────────────  │
│  • BUY 10 AAPL @ $185.50       [ FILLED ]    │
│    Today, 10:15 AM • Total: $1,855.00        │
│                                              │
│  • BUY 5 MSFT Limit $410.00    [ PENDING ]   │
│    Yesterday, 2:30 PM                        │
│                                              │
│  • SELL 20 TSLA @ $245.00      [ FILLED ]    │
│    Sep 15, 11:00 AM • Total: $4,900.00       │
└──────────────────────────────────────────────┘
```

We're missing the actual write action of buying shares, which I imagine can be even more read heavy since all prices are changing in real time

> **TODO [FORMATION HIGH 1]:** Stock Detail is read+write (quote + swipe-to-buy). Name `placeOrder`. The user expects a fast ACK, not necessarily `FILLED`. The write lives on Detail, not missing from History.

And then another read screen showing what is being or has been purchased

Overall: Based on the scope of this system design exercise, it's a read heavy application, users expect near-real time visualization of prices, probably with some forgiviness if the prices changes by a few cents at the time of purchase.

> **TODO [FORMATION LOW 10]:** Keep these UI notes short. After Detail is fixed as the write, jump to the §1 napkin math and the §3 splits.

## 1. Market size and traffic

> **TODO [FORMATION HIGH 2]:** Derive napkin peak sizing with the parents shown. Pick a DAU. Trades/day = DAU × trades/user/day — fix "Trades / user / day: 2M trades a day" (that figure is not a per-user rate). Busy window ~6.5h ≈ 23.4k seconds, or ~8h. Avg write QPS = trades/day ÷ busy_seconds. Peak ≈ avg × (24 / busy_hours) ≈ ~3× for ~8h, or a named open-burst of 5–10×. Same derivation for reads. Show the arithmetic.

- US tickers: 12k (important for any type of cardinality concerns)

> **TODO [FORMATION MED 8]:** Cardinality follow-through on the 12k tickers line. Why a hot-set cache (~50–500 symbols) matters versus the cold universe.

- Trades / user / day: 2M trades a day roughly (actually still a lot of writes, but assuming that reads are least 3x this given the multiple screens we have any sort of real time updates)
- Read QPS avg+peak: 200 QPS (10x rough estimate from writes), peak 2000 QPS
- Write QPS avg+peak: 20 QPS avg, peak 200 QPS

### 1b. Bottlenecks

> **TODO [FORMATION HIGH 5]:** Four bottleneck lines. One line each, shaped as failure → mitigation: hot-key quotes; open thundering herd; mobile retry double-submit; batch partial failure.

## 2. Actions

Each product interaction is an action. For each one, answer two questions: how important this endpoint is for the user requirements, and if it fails, what the user's tolerance level is.

> **TODO [FORMATION MED 6]:** Sharpen the tolerances to something SLA-ish. Quotes: p99 and a stale-by bound. `placeOrder`: gateway ACK ~100ms, and never silent. `viewOrder` and history: prefer in-app status, with email as the backup.

### `viewStockQuote`

**How important is this endpoint for the user requirements?**

```text
high
```

**If this endpoint were to fail, what's the user's tolerance level?**

```text
tolerates momentary delays
```

### `viewStockQuotes`

**How important is this endpoint for the user requirements?**

```text
high
```

**If this endpoint were to fail, what's the user's tolerance level?**

```text
tolerates momentary delays
```

### `placeOrder`

**How important is this endpoint for the user requirements?**

```text
critical
```

**If this endpoint were to fail, what's the user's tolerance level?**

```text
critical
```

### `viewOrder`

**How important is this endpoint for the user requirements?**

```text
high
```

**If this endpoint were to fail, what's the user's tolerance level?**

```text
would be confused, might trigger an outreach if not present (likely better to say we'll send you an email)
```

### `viewAllOrders`

**How important is this endpoint for the user requirements?**

```text
high
```

**If this endpoint were to fail, what's the user's tolerance level?**

```text
would be confused, might trigger an outreach if not present (likely better to say we'll send you an email)
```

## 3. Architecture

1. REST poll vs SSE/WS:

These are rest endpoints with a SSE on failure to show order confirmation

> **TODO [FORMATION HIGH 4]:** Replace "SSE on failure for order confirmation" with the async model. REST `201` + `PENDING`/`RECEIVED` ACK; poll `viewOrder` or subscribe for the fill. SSE/WS is optional for status push — not a failure path. One sentence: ACK ≠ exchange fill.

2. Idempotency-Key + Redis:  
Redis to store stock quotes as the intermediate data source  
Idempotency-key for POST requests

> **TODO [FORMATION HIGH 3]:** Split the quote cache and the Idempotency-Key into two bullets / two jobs. Redis/edge = short-TTL quotes. `Idempotency-Key` = `POST /orders` only (same key + same body → same order; mismatch → `409`).

## 4. HTTP contracts

> **TODO [FORMATION MED 7]:** Stub four HTTP contracts:
>
> - `GET` quote
> - `GET` batch (partial success)
> - `POST /orders` (`Idempotency-Key`, decimal strings, `201` `PENDING`, `422` / `409`)
> - `GET /orders/{id}` (IDOR → `404`, not `403`)
