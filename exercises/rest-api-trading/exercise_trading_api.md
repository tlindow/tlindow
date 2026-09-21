# sStock Trading REST API

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

And then another read screen showing what is being or has been purchased

Overall: Based on the scope of this system design exercise, it's a read heavy application, users expect near-real time visualization of prices, probably with some forgiviness if the prices changes by a few cents at the time of purchase.

## 1. Market size and traffic

- US tickers: 12k (important for any type of cardinality concerns)
- Trades / user / day: 2M trades a day roughly (actually still a lot of writes, but assuming that reads are least 3x this given the multiple screens we have any sort of real time updates)
- Read QPS avg+peak: 200 QPS (10x rough estimate from writes), peak 2000 QPS
- Write QPS avg+peak: 20 QPS avg, peak 200 QPS

## 2. Actions

Each product interaction is an action. For each one, answer two questions: how important this endpoint is for the user requirements, and if it fails, what the user's tolerance level is.

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
2. Idempotency-Key + Redis:  
Redis to store stock quotes as the intermediate data source  
Idempotency-key for POST requests