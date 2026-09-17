# Next.js App Router Mastery: High-Performance Ledger & Streaming Architecture

Welcome to the hands-on **Next.js (App Router) architectural exercise**. This exercise is tailored to modern React Server Components (RSC), Suspense streaming, optimistic mutations via Server Actions, and granular cache invalidation.

---

## 🎯 Learning Objectives

By the end of this exercise, you will master the key mental models and patterns of **Next.js 15/16 App Router**:

1. **RSC vs Client Component Boundary**: Decoupling data fetching in pure asynchronous Server Components from interactive stateful Client Components (`"use client"`).
2. **Streaming & Instant Loading States**: Using React `<Suspense>` boundaries and `loading.tsx` to stream slow backend dependencies (e.g. third-party settlement rails, banking webhooks) without blocking initial page shell render.
3. **Server Actions & Optimistic UI**: Writing type-safe Server Actions for financial mutations and combining them with React's `useOptimistic` hook for instantaneous user feedback.
4. **Granular Cache & Revalidation**: Understanding `unstable_cache`, `revalidatePath`, `revalidateTag`, and deterministic cache invalidation strategies.
5. **Parallel & Intercepting Routes**: Designing complex dashboard layouts with parallel slots (`@analytics`, `@feed`) and intercepting routes (`(.)transfers/[id]`) for modals that preserve shareable URLs.
6. **Static Export vs Dynamic Rendering Constraints**: Managing the trade-offs between static export (`output: "export"`), Edge runtime, and server-side request pipelines.

---

## 🏗️ Domain Scenario: Real-Time Merchant Treasury Dashboard

You are designing the architecture for a Next.js Treasury & Settlement Dashboard:
- The **Dashboard Shell** must load instantly (sub-50ms TTFB) from the edge/static cache.
- The **High-Volume Transactions Feed** streams in asynchronously via Suspense while bank settlement APIs compute rolling totals.
- When an operator initiates a **Payout Disbursement**, the UI updates optimistically, dispatches a Server Action, and precisely revalidates only affected ledger tags (`treasury:balance`, `merchant:payouts`).

---

## 📝 Exercise Breakdown

The exercise files in this folder walk you through 5 progressive architecture steps:

### [Step 1: The Server Component Boundary & Data Pipeline](file:///Users/tylerlindow/repos/tlindow/exercises/nextjs-learning/exercise_01_rsc_pipeline.tsx)
- **Goal**: Fetch treasury balances and ledger summary directly on the server with zero client bundle overhead.
- **Challenge**: Separate sensitive database/API calls from interactive child components.

### [Step 2: Streaming with Suspense & Fallback Skeletons](file:///Users/tylerlindow/repos/tlindow/exercises/nextjs-learning/exercise_02_streaming_suspense.tsx)
- **Goal**: Wrap asynchronous data-heavy components with granular `<Suspense>` boundaries.
- **Challenge**: Prevent slow third-party banking feeds from delaying fast local account metadata.

### [Step 3: Server Actions & Optimistic Mutations](file:///Users/tylerlindow/repos/tlindow/exercises/nextjs-learning/exercise_03_server_actions_optimistic.tsx)
- **Goal**: Implement a `disburseFundsAction` and pair it with `useOptimistic` in a Client Component.
- **Challenge**: Roll back optimistic UI state if the financial transaction fails validation or gets rejected by the bank rail.

### [Step 4: Tag-Based Cache Invalidation](file:///Users/tylerlindow/repos/tlindow/exercises/nextjs-learning/exercise_04_cache_revalidation.ts)
- **Goal**: Configure cached fetch requests with `tags` and invoke `revalidateTag()` inside mutation actions.
- **Challenge**: Avoid over-invalidating unrelated dashboard metrics while ensuring absolute ledger freshness.

### [Step 5: Parallel & Intercepting Route Architecture](file:///Users/tylerlindow/repos/tlindow/exercises/nextjs-learning/exercise_05_parallel_intercepting.tsx)
- **Goal**: Structure a parallel dashboard slot (`@modal`, `@ledger`) with intercepting route handlers.
- **Challenge**: Create a slick transaction detail drawer/modal that opens over the existing dashboard without a full page reload, yet remains fully shareable when accessed directly.

---

## 🚀 How to Start

1. Open [`exercise_01_rsc_pipeline.tsx`](./exercise_01_rsc_pipeline.tsx) in your editor.
2. Follow the prompt instructions and type out the component architecture step by step.
3. Advance through the exercises to build a comprehensive mental model of the Next.js App Router.
