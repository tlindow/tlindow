# 🎯 Exercise: Stock Trading REST API Contract Design

Welcome to your hands-on REST API design lab. Type your answers directly into the designated `[YOUR SPECIFICATION HERE]` blocks below.

Remember: **Typing IS learning.** Resisting the urge to copy-paste or skim helps lock in HTTP semantics, resource naming instincts, and production API design patterns.

---

## 📌 Domain Overview
You are designing the public REST API for a retail brokerage application (like Robinhood). Users interact with market data feeds and execute orders across trading sessions.

---

## Step 1: Single Market Stock Quote (`viewStockQuote`)

### 📋 Scenario
A user taps on **AAPL** to open the stock detail page. The mobile app needs to fetch the most up-to-date market quote, latest price, bid/ask spread, and daily volume.

### 🧠 Questions to Consider
1. What HTTP verb makes this operation **safe** and **cacheable**?
2. Should `symbol` be in the path, query string, or body? Is the symbol a unique resource identifier?
3. What happens if the ticker symbol does not exist (e.g., `XYZFAKE`)? What status code should return?
4. How should price and monetary values be represented to avoid floating-point errors?

### ✍️ [STEP 1 EXERCISE] Type your contract below:

```http
### View Stock Quote
HTTP Method: [YOUR ANSWER: e.g. GET / POST / PUT]
Path:        [YOUR ANSWER: e.g. /api/v1/...]

Headers:
  Accept: application/json

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
  // Include: symbol, currentPrice, bid, ask, volume, currency, timestamp (ISO-8601)
}
```

---

## Step 2: Batch Market Stock Quotes (`viewStockQuotes`)

### 📋 Scenario
A user opens their **Watchlist** or **Portfolio Home Screen**, which displays current prices for 10-50 stocks simultaneously (e.g. `AAPL`, `MSFT`, `NVDA`, `GOOGL`).

### 🧠 Questions to Consider
1. Should this be a `GET` or a `POST`? Some developers instinctively use `POST` when inputs are a list—why is `GET` preferred for RESTful reads, and under what rare constraint (URI length limits) might a batch `POST` or `SEARCH` be considered?
2. How should multiple symbols be encoded in the query string?
   - Delimited string: `?symbols=AAPL,MSFT,NVDA`
   - Repeated keys: `?symbol=AAPL&symbol=MSFT&symbol=NVDA`
   Which is more common in public financial APIs, and how does your server parse it?
3. What if 2 out of 5 symbols are invalid or halted? Does the whole request fail (`404`), or do you return a partial payload with a list of quotes and an errors/warnings array (`200 OK` with per-item status)?

### ✍️ [STEP 2 EXERCISE] Type your contract below:

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
  // Include: array of quotes, and optionally a list of unresolvable/invalid symbols
}
```

---

## Step 3: Placing an Order (`placeOrder`)

### 📋 Scenario
The user taps **"Swipe to Buy"** to place an order: buying `10` shares of `AAPL` as a `LIMIT` order at `$180.00` (or a `MARKET` order).

### 🧠 Questions to Consider
1. What HTTP verb is appropriate for creating a new resource?
2. What status code must a successfully created resource return? What header should point to the newly created order?
3. **Idempotency**: What happens if the user is in a subway tunnel, taps "Buy", the server receives and executes the order, but the connection drops before the client receives the `201`? If the app retries automatically, how do you prevent buying twice?
   *(Hint: What header does Stripe and Robinhood require for mutating financial endpoints?)*
4. What fields are required in the request body? (`symbol`, `quantity`, `side`: BUY/SELL, `orderType`: MARKET/LIMIT, `limitPrice`, `timeInForce`: GTC/DAY).

### ✍️ [STEP 3 EXERCISE] Type your contract below:

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
  // Include: orderId, symbol, quantity, side, orderType, status (e.g. "PENDING" / "FILLED"), createdAt
}
```

---

## Step 4: Inspecting a Specific Order (`viewOrder`)

### 📋 Scenario
After placing an order, or when clicking an entry in their activity feed, the user views the exact state and fills for order `ord_987654321`.

### 🧠 Questions to Consider
1. Is `orderId` a path parameter or a query parameter? Why?
2. What order lifecycle statuses should be represented? (`PENDING`, `SUBMITTED`, `PARTIALLY_FILLED`, `FILLED`, `CANCELLED`, `REJECTED`, `EXPIRED`).
3. Should execution details (e.g. `filledQuantity`, `averageExecutionPrice`, `executedAt`, `fees`) be included in the response?
4. What if the order belongs to another user? What status code should return? (`404 Not Found` to prevent account enumeration, vs `403 Forbidden`).

### ✍️ [STEP 4 EXERCISE] Type your contract below:

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
}
```

---

## Step 5: User Order History & Auth Scoping (`viewAllOrders`)

### 📋 Scenario
The user opens their **"Order History"** or **"Statements & History"** tab to see past orders, filterable by date, status, or symbol.

### 🧠 Critical System Design & Security Question (The IDOR Dilemma)
The problem prompt states:
> `viewAllOrders(userId) -> view all orders made by given userId`

In many beginner designs, people create:
`GET /api/v1/users/{userId}/orders`

Ask yourself:
1. In a client mobile app where the user is already authenticated via JWT / Bearer token, why is exposing `{userId}` in the client route an **anti-pattern** or security hazard (IDOR — Insecure Direct Object Reference)?
2. What is the idiomatic RESTful alternative for the current user's own resources?  
   *(Option A: `GET /api/v1/orders` where `userId` is inferred from the token)*  
   *(Option B: `GET /api/v1/users/me/orders` or `GET /api/v1/me/orders`)*
3. When *would* `GET /api/v1/users/{userId}/orders` be appropriate? (Internal admin back-office, compliance dashboards).
4. What query parameters are required for pagination and filtering? (`limit`, `cursor` or `page`, `status`, `symbol`, `startDate`).

### ✍️ [STEP 5 EXERCISE] Type your contract below:

```http
### View Order History
HTTP Method: [YOUR ANSWER]
Path:        [YOUR ANSWER: Compare client-facing path vs admin path]

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

---

## Nova / Formation status (2026-09-21)

Formation task [CRUD APIs with REST — Q2](https://formation.dev/platform/task/d01eb5c0-1bff-11f1-ad32-c1ed1533443e): **Nailed It!** after revision covering all five actions (placeOrder + four reads). No High Priority items on the final review.

Working notes only live in this profile-repo lab (`tlindow/tlindow`). Do not host exercises on the marketing site.

### TODOs — close these gaps in *this* markdown (type into the Step blocks above)

Interview / Diagnostic altitude (beyond Formation Q2 pass):

- [ ] **TODO: Stock Detail = write** — In Step 1 notes or a short UI blurb, state swipe-to-buy on Detail is a write path (Step 3), not a read-only screen.
- [ ] **TODO: Napkin QPS from DAU** — Add a short § before Step 6: pick DAU → avg QPS → peak ≈ avg × (24/busy_hours) (~3×). Split quote reads vs order writes. (Working napkin used on Formation: reads ~200 avg / ~2000 peak; writes ~20 avg / ~200 peak — re-derive explicitly.)
- [ ] **TODO: HLD box** — After contracts, one diagram/list: quote service, order service, matching-engine queue, orders DB; **Redis quote cache ≠ Redis Idempotency-Key store**.
- [ ] **TODO: Bottleneck mechanisms (3–4)** — Name *how*: hot-ticker cache stampede; idempotency-key lock/TTL on write path; matching lag → `201` + `PENDING` then poll/SSE; watchlist N+1 → batch quotes.
- [ ] **TODO: Fill Steps 1–5 answer blocks** — Copy Formation-passed contracts into each `[YOUR ANSWER]` / sample JSON (DecimalString money; batch `unresolvedSymbols`; `POST /api/v1/orders` + Idempotency-Key + `201`/`PENDING`; `GET /api/v1/orders/:id` with IDOR→404; token-scoped `GET /api/v1/orders`).
- [ ] **TODO: Fill Step 6 reflections** — Streaming vs REST; Redis idempotency TTL/lock; float vs decimal; async fill lifecycle (already coached — write 1–2 sentences each).
- [ ] **TODO: Re-run on Formation only if you change substance** — GitHub MD is practice; scored path stays formation.dev Nova.

