# 🎯 Exercise: Stock Trading REST API Contract Design

Welcome to your hands-on REST API design kata. Type your answers directly into the designated `[YOUR SPECIFICATION HERE]` blocks below.

Remember: **Typing IS learning.** Resisting the urge to copy-paste or skim helps lock in HTTP semantics, resource naming instincts, and production API design patterns.

---

## 🧭 4-Step System Design Roadmap

```text
[0. Platform Recon & Assumptions] ──> [1. Traffic & Requirements] ──> [2. REST Contracts] ──> [3. Architecture] ──> [4. Deep Dives]
```

---

## 📱 Pre-Step: UI Mocks & User Mental Model

Before diving into system requirements and API contracts, review these simplified UI mocks of the trading platform. Walk through the user journey and list out the **expected user behaviors** at each screen.

### Mock 1: Watchlist & Home Screen
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

### Mock 2: Stock Detail & Order Placement
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

### Mock 3: Order History & Activity Feed
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



---

### ✍️ List Expected User Behaviors
Based on the mocks above, write out what the user expects the system to do:

```text
1. When loading the Home Screen / Watchlist:
   - Expected behavior: [YOUR ANSWER: e.g. Instant display of prices for 10-50 stocks, no lag...]

2. When viewing a single Stock Detail page:
   - Expected behavior: [YOUR ANSWER: e.g. Real-time quote, bid/ask spread, buying power...]

3. When executing a Trade ("Swipe to Buy"):
   - Expected behavior: [YOUR ANSWER: e.g. Validation, immediate order acknowledgement, safety against double-clicks...]

4. When reviewing Order History:
   - Expected behavior: [YOUR ANSWER: e.g. View chronological past orders, fill statuses, execution prices...]
```

---

## 🏛️ Framework Step 1: Market Size, Traffic & Bottleneck Analysis

Before designing API endpoints and data contracts, quantify the scale of the domain, extrapolate traffic loads, identify the first architectural bottlenecks, and define the retry and error strategies.

---

### Part 1: Market Sizing & Data Universe Magnitude
Establish the baseline numbers of the financial market and user base:

```text
1. Total Market Stock Universe:
   - Total US Equities (NYSE + NASDAQ): ~[YOUR ESTIMATE: e.g. 8,000 - 10,000 tickers]
   - "Hot" Active Tickers (S&P 500 / High-volume meme & mega-caps): ~[YOUR ESTIMATE: e.g. 500 tickers]
   - Why does this matter? (Hint: Does 10,000 tickers fit entirely in memory in a single Redis node? What is the footprint of 10,000 quote objects?)
   > [YOUR REFLECTION HERE]

2. User Scale Assumptions:
   - Daily Active Users (DAU): [YOUR ESTIMATE: e.g. 10 Million DAU]
   - Average Watchlist size per user: [YOUR ESTIMATE: e.g. 20 - 30 stocks]
   - Average trades per user per day: [YOUR ESTIMATE: e.g. 0.5 - 2 trades/day]
```

---

### Part 2: Traffic Extrapolations (Read vs Write Profiles)

```text
1. Market Data Subsystem (Read Heavy):
   - Daily Quote Reads: (10M DAU × 20 watchlist views/refreshes × 20 stocks) = ~4 Billion quote reads/day.
   - Market Trading Hours: 6.5 hours (9:30 AM – 4:00 PM EST) = ~23,400 seconds.
   - Average Read QPS: ~[YOUR CALCULATION: ~150,000 to 200,000 QPS]
   - Peak Volatility Multiplier (9:30 AM open): ~[YOUR ESTIMATE: 5x - 10x average]
   - Latency & SLA Target: [YOUR ANSWER: e.g. p99 < 50ms, cacheable at Edge CDN / Redis]
   - Consistency Model: [YOUR ANSWER: Eventual consistency vs Strict ACID - is 500ms price lag acceptable for mobile UI?]

2. Order Execution Subsystem (Write Critical):
   - Daily Trade Orders: (10M DAU × 1 trade/day) = ~10 Million orders/day.
   - Average Write QPS: (10M / 23,400s) = ~400 - 500 QPS.
   - Peak Burst QPS (Market Open / FOMC rate cuts): ~5,000 - 10,000 QPS.
   - Latency & SLA Target: [YOUR ANSWER: e.g. Gateway ACK < 100ms, queue handoff]
   - Consistency Model: [YOUR ANSWER: Strict ACID, zero-data-loss, transactional guarantees]
```

---

### Part 3: Identifying the First 4 System Bottlenecks
Given the numbers above, where will the system break first?

```text
1. Bottleneck 1 (Hot Key Contention on Market Data):
   - 80% of all users look at the same ~50 mega-cap tickers (AAPL, TSLA, NVDA, SPY).
   - What happens if 500,000 users query the database for AAPL at 9:30 AM?
   > [YOUR ANALYSIS & MITIGATION: e.g. Redis In-Memory Cache / CDN edge caching with short TTL]

2. Bottleneck 2 (Market Open Order Thundering Herd):
   - At 9:30:00 AM EST, thousands of limit/market orders flood in simultaneously.
   - What happens if the Order API tries to synchronously write and execute against the downstream exchange?
   > [YOUR ANALYSIS & MITIGATION: e.g. Async message queues (Kafka/RabbitMQ), backpressure]

3. Bottleneck 3 (Flaky Mobile Networks & Retry Storms on Writes):
   - Mobile users on cellular connections submit orders in subways/elevators; packets drop after server execution.
   - What happens if the client automatically retries `POST /orders` without a safety mechanism?
   > [YOUR ANALYSIS & MITIGATION: e.g. Double execution risk, Idempotency-Key with distributed lock]

4. Bottleneck 4 (Partial Failure in Batch Watchlist Reads):
   - A user's watchlist has 25 stocks. 2 stocks are halted or delisted.
   - What happens if the batch endpoint fails completely (500 or 404)?
   > [YOUR ANALYSIS & MITIGATION: e.g. Partial success payload with per-ticker status envelope]
```

---

### Part 4: API Error, Retry & Resilience Strategy
Before defining routes, decide how the client and server negotiate failure:

```text
1. Retryable Status Codes (Transient Failures):
   - 429 Too Many Requests: [When should this return? Should client use exponential backoff + jitter?]
   - 503 Service Unavailable / 504 Gateway Timeout: [How should client retry with Retry-After header?]

2. Non-Retryable Status Codes (Client Validation / Domain Rejections):
   - 400 Bad Request: [e.g. Malformed payload, negative share quantity]
   - 401 Unauthorized / 403 Forbidden: [e.g. Expired token, unverified account]
   - 422 Unprocessable Entity: [e.g. Insufficient buying power, market closed for market orders]
   - 409 Conflict: [e.g. Idempotency key conflict with mismatched payload]

3. Action Partitioning & Degraded Mode:
   - If market data streaming is delayed, can users still view past order history?
   - Why must the Market Data cluster and Order Execution cluster be completely isolated microservices?
   > [YOUR REFLECTION HERE]
```

---

## 🔌 Framework Step 2: Core Domain & REST API Contracts

Translate the domain actions into production REST interfaces. For each endpoint, first reason through the **Architectural & Traffic Context**, then type the **HTTP Wire Contract**.

---

### Endpoint 1: Single Market Stock Quote (`viewStockQuote`)

#### 📋 Scenario & Context
A user taps on **AAPL** to open the stock detail page. The mobile app needs to fetch the most up-to-date market quote, latest price, bid/ask spread, and daily volume.

#### 🏛️ High-Level System Reasoning
- **Traffic & Caching**: [YOUR ANSWER: Is this endpoint cacheable? Where (CDN, Redis, Gateway)? What `Cache-Control` max-age makes sense?]
- **Safety Invariant**: [YOUR ANSWER: Why must this operation be strictly idempotent and safe?]

#### ✍️ HTTP Contract Specification
```http
### View Stock Quote
HTTP Method: [YOUR ANSWER: e.g. GET / POST / PUT]
Path:        [YOUR ANSWER: e.g. /api/v1/...]

Headers:
  Accept: application/json
  // [Optional: Cache-Control or Conditional Headers]

Path Parameters:
  - [param_name]: [description & type]

Query Parameters:
  - [param_name]: [description & type, or "None"]

Request Body:
  [None or JSON schema]

Status Codes:
  - 200 OK: [Description]
  - 404 Not Found: [Description]

Sample Response (200 OK):
{
  // [YOUR JSON RESPONSE HERE]
  // Include: symbol, currentPrice, bidPrice, askPrice, volume, currency, updatedAt (ISO-8601)
  // Remember: Use String decimal ("185.50") for monetary precision!
}
```

### Endpoint 2: Batch Market Stock Quotes (`viewStockQuotes`)

#### 📋 Scenario & Context
A user opens their **Watchlist** or **Portfolio Home Screen**, which displays current prices for 10-50 stocks simultaneously (e.g. `AAPL`, `MSFT`, `NVDA`, `GOOGL`).

#### 🏛️ High-Level System Reasoning
- **Batching & URI Constraints**: [YOUR ANSWER: Why use GET with query params instead of POST? When would URI length limits become an issue?]
- **Partial Failure & Cache Strategy**: [YOUR ANSWER: If 1 out of 20 tickers is halted/invalid, does the request fail 404 or return partial 200 OK? Can CDNs cache multi-symbol queries?]

#### ✍️ HTTP Contract Specification
```http
### View Batch Stock Quotes
HTTP Method: [YOUR ANSWER]
Path:        [YOUR ANSWER]

Headers:
  Accept: application/json

Path Parameters:
  [None or specify]

Query Parameters:
  - [param_name]: [description & format, e.g. comma-separated list of symbols]

Request Body:
  [None or specify]

Status Codes:
  - 200 OK: [Description]
  - 400 Bad Request: [Description]

Sample Response (200 OK):
{
  // [YOUR JSON RESPONSE HERE]
  // Include: array or map of quotes, and optionally unresolvedSymbols list
}
```

---

### Endpoint 3: Placing an Order (`placeOrder`)

#### 📋 Scenario & Context
The user taps **"Swipe to Buy"** to place an order: buying `10` shares of `AAPL` as a `LIMIT` order at `$180.00` (or a `MARKET` order).

#### 🏛️ High-Level System Reasoning
- **Financial Mutability & Network Retries**: [YOUR ANSWER: If network drops after buy execution, how does `Idempotency-Key` prevent double buys?]
- **Async Execution Invariant**: [YOUR ANSWER: Does this endpoint wait for matching engine fill, or return 201 with `PENDING` status?]

#### ✍️ HTTP Contract Specification
```http
### Place Order
HTTP Method: [YOUR ANSWER]
Path:        [YOUR ANSWER]

Headers:
  Content-Type: application/json
  Authorization: Bearer <token>
  Idempotency-Key: [YOUR NOTE: Explain purpose of this header]

Path Parameters:
  [None or specify]

Query Parameters:
  [None or specify]

Request Body:
{
  // [YOUR JSON REQUEST BODY HERE]
  // Include: symbol, side (BUY/SELL), quantity, orderType (MARKET/LIMIT), limitPrice, timeInForce (DAY/GTC)
}

Status Codes:
  - 201 Created: [Description, include Location header]
  - 400 Bad Request: [e.g. Invalid quantity or unknown order type]
  - 401 Unauthorized: [Missing or invalid auth token]
  - 422 Unprocessable Entity: [e.g. Insufficient buying power or market closed]
  - 409 Conflict: [e.g. Idempotency key conflict with different payload]

Sample Response (201 Created):
{
  // [YOUR JSON RESPONSE HERE]
  // Include: orderId, symbol, quantity, side, orderType, status (e.g. "PENDING"), createdAt
}
```

---

### Endpoint 4: Inspecting a Specific Order (`viewOrder`)

#### 📋 Scenario & Context
After placing an order, or when clicking an entry in their activity feed, the user views the exact state and fills for order `ord_987654321`.

#### 🏛️ High-Level System Reasoning
- **Resource Identity & Privacy**: [YOUR ANSWER: If user A tries to fetch user B's `orderId`, why return `404 Not Found` instead of `403 Forbidden`?]
- **Fill State Progression**: [YOUR ANSWER: What lifecycle statuses and fill breakdown must this model support?]

#### ✍️ HTTP Contract Specification
```http
### View Specific Order
HTTP Method: [YOUR ANSWER]
Path:        [YOUR ANSWER]

Headers:
  Authorization: Bearer <token>
  Accept: application/json

Path Parameters:
  - [param_name]: [description & type]

Query Parameters:
  [None or specify]

Status Codes:
  - 200 OK: [Description]
  - 401 Unauthorized: [Description]
  - 404 Not Found: [Description]

Sample Response (200 OK):
{
  // [YOUR JSON RESPONSE HERE]
  // Include: orderId, symbol, status, filledQuantity, averageExecutionPrice, fills array
}
```

---

### Endpoint 5: User Order History & Auth Scoping (`viewAllOrders`)

#### 📋 Scenario & Context
The user opens their **"Order History"** or **"Statements & History"** tab to see past orders, filterable by date, status, or symbol.

#### 🏛️ High-Level System Reasoning
- **Security & The IDOR Dilemma**: [YOUR ANSWER: Why is `GET /users/{userId}/orders` an anti-pattern for mobile clients compared to `GET /orders` or `GET /users/me/orders`?]
- **Pagination Strategy**: [YOUR ANSWER: Why is cursor-based pagination preferred over offset/page pagination for high-frequency order feeds?]

#### ✍️ HTTP Contract Specification
```http
### View Order History
HTTP Method: [YOUR ANSWER]
Path:        [YOUR ANSWER: Client-facing auth-scoped path vs Admin path]

Headers:
  Authorization: Bearer <token>
  Accept: application/json

Path Parameters:
  [None or specify]

Query Parameters:
  - [param_name]: [e.g. status filter, pagination limit, cursor, symbol]

Request Body:
  [None]

Status Codes:
  - 200 OK: [Description]
  - 400 Bad Request: [Invalid filter or cursor]
  - 401 Unauthorized: [Missing or invalid token]

Sample Response (200 OK):
{
  // [YOUR JSON RESPONSE HERE]
  // Include: items array, pagination cursor/next_page_token, total_count (optional)
}
```

---

## Step 6: Senior Architectural Altitude Drill

Now step back and put on your **System Design Interviewer / Tech Lead hat**. Answer these 4 architectural questions in 1-2 concise sentences each:

1. **Market Data Streaming vs REST Polling**:  
   If market quotes tick every 50ms during high volatility, why is HTTP REST polling inefficient for the mobile app, and how does Robinhood architect live price updates? (Hint: SSE / WebSockets). Where does the REST `GET /quotes` endpoint still fit?
   > **Your reflection:**

2. **Idempotency Implementation**:  
   How does the API Gateway or Order Service use the `Idempotency-Key` header with Redis to protect against double-charging? What key TTL and locking mechanism should be used?
   > **Your reflection:**

3. **Float vs Decimal Precision**:  
   Why is `{ "price": 180.25 }` stored or serialized as a floating-point number dangerous in high-volume trade accounting, and how should an API schema define monetary amounts?
   > **Your reflection:**

4. **Order Status Lifecycle & Asynchronous Processing**:  
   When a user submits `POST /orders`, is the order instantly `FILLED` synchronously before returning `201 Created`? Or does the API return `201 Created` with status `PENDING` / `RECEIVED` while dispatching to an asynchronous matching engine queue?
   > **Your reflection:**
