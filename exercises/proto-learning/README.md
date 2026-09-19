# Protobuf Mastery: Merchant Settlements & Payout Rails

Welcome to the interactive Protobuf (`.proto`) tutorial. This hands-on exercise is designed around **B2B Merchant Settlements, Bank Account Routing, Fee Pricing Schedules, and Ledger Payouts**.

Instead of reading static syntax documentation, you learn Protobuf by actively typing and designing production-grade schemas.

---

## 🎯 Learning Objectives

By the end of this exercise, you will master the foundational and production-grade concepts of **Protocol Buffers (proto3)**:

1. **Schema Packaging & Syntax**: `syntax = "proto3"`, package namespacing (`package fintech.settlement.v1;`), and importing Google Well-Known Types (`google.protobuf.Timestamp`).
2. **Monetary Precision vs Floating Point**: Designing lossless financial structures (e.g., `Money` with ISO currency codes, integer units, and nanos) instead of IEEE-754 `float`/`double`.
3. **Enum Semantics & Proto3 Zero-Value Baseline**: Why proto3 requires `_UNSPECIFIED = 0` as the first enum value and how default values affect wire transmission.
4. **Polymorphic Destinations with `oneof`**: Modeling mutually exclusive payout methods (Tokenized Bank Account vs ACH/FedNow vs International Wire) without wasting wire bytes or requiring complex validation logic.
5. **Hierarchical Collections & Dynamic Data**: Using `repeated` for ledger line items / fee schedules and `map<string, string>` for merchant reconciliation metadata.
6. **Field Numbering & Schema Evolution**: Understanding the 1-byte wire encoding optimization for field tags `1` through `15`, tag immutability, and using `reserved` to prevent accidental tag collisions across team versions.
7. **gRPC Interface Contracts**: Defining Unary RPCs (idempotent batch creation) and Server Streaming RPCs (streaming ledger events as settlements clear financial rails).

---

## 🏗️ Domain Scenario: High-Throughput Merchant Settlements

You are designing the contract for a merchant platform settlement engine. Every settlement cycle:
- Millions of dollars in merchant transactions are aggregated into batches.
- Contractual fee deductions (basis points + fixed per-transaction fees) and rolling reserve withholdings are applied.
- The net payout amount is computed and routed to the merchant's chosen bank destination rail (Direct ACH, FedNow real-time rail, International Wire, or a Tokenized Account).
- A real-time ledger stream emits events as settlement batches transition through states (`PENDING` → `CALCULATING` → `FUNDED` → `IN_TRANSIT` → `SETTLED` / `FAILED`).

---

## 📝 Exercise Breakdown

The starter file [`merchant_settlement.proto`](./merchant_settlement.proto) contains 6 progressive challenge steps:

### Step 1: Monetary Precision
- **Goal**: Model a `Money` message representing exact currency amounts (e.g., `$1,250.75 USD`).
- **Concepts**: `int64 units`, `int32 nanos`, ISO currency string.

### Step 2: Lifecycle Enums & Rails
- **Goal**: Define `SettlementStatus` and `DisbursementRail` enums.
- **Concepts**: Proto3 zero-value convention (`_UNSPECIFIED = 0`), enum prefix scoping.

### Step 3: Polymorphic Payout Destinations
- **Goal**: Model mutually exclusive payout rails (ACH routing/account, Tokenized Account ID, International SWIFT/IBAN).
- **Concepts**: `oneof destination` block.

### Step 4: Line Items & Fee Deduction Breakdown
- **Goal**: Model itemized transaction charges, fee tiers, dispute adjustments, and reconciliation key-value tags.
- **Concepts**: `repeated` fields, `map<string, string> metadata`.

### Step 5: The SettlementBatch Aggregate
- **Goal**: Compose the complete root message with field tags, timestamps, and schema reservations.
- **Concepts**: Field tags 1-15 hot path optimization, `reserved` field tags and names.

### Step 6: gRPC Service Interface
- **Goal**: Write unary and server-streaming service definitions for batch creation and ledger feeds.
- **Concepts**: `service`, Unary RPC, `stream` response RPC.

---

## 🚀 How to Start

1. Open [`exercises/proto-learning/merchant_settlement.proto`](./merchant_settlement.proto).
2. Work through each `[STEP X EXERCISE]` marker.
3. Test your mental model as you implement each message and enum definition.
