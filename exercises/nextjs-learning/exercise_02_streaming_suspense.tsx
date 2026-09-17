// ============================================================================
// STEP 2 EXERCISE: Streaming with React Suspense & Granular Loading Skeletons
// ============================================================================
// Scenario:
// On our Treasury Dashboard, fetching the core account balance takes ~20ms,
// but querying the external banking settlement rail (FedNow / ACH clearing) takes ~1800ms.
//
// In traditional SSR, the user stares at a blank screen for 1800ms.
// In Next.js App Router, we can stream the page shell immediately and suspend
// the slow settlement rail component inside a `<Suspense>` boundary.
//
// 🎯 Learning Objectives:
// - Use React `<Suspense>` to stream slow asynchronous component subtrees.
// - Design accessible loading skeleton fallbacks that prevent Cumulative Layout Shift (CLS).
// - Understand how Next.js streams HTML chunks progressively over HTTP.
// ============================================================================

import React, { Suspense } from "react";

// ----------------------------------------------------------------------------
// 1. Slow Asynchronous Sub-Component
// ----------------------------------------------------------------------------
async function ClearingRailStatusStream() {
  // Simulate slow third-party API latency (e.g. FedNow network status)
  await new Promise((resolve) => setTimeout(resolve, 1800));

  const networkStatus = {
    fedNowActive: true,
    achCutoffTime: "17:00 EST",
    averageSettlementLatencyMs: 420,
  };

  return (
    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-sm">Settlement Rails Operational</span>
      </div>
      <p className="text-xs text-emerald-800">
        FedNow Real-Time Rail: Active · Next ACH Batch Window: {networkStatus.achCutoffTime}
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 2. Loading Skeleton Fallback
// ----------------------------------------------------------------------------
function ClearingRailSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-stone-100 border border-stone-200 animate-pulse space-y-2">
      <div className="h-4 w-48 bg-stone-300 rounded" />
      <div className="h-3 w-64 bg-stone-200 rounded" />
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. Composed Dashboard with Streaming Boundary
// ----------------------------------------------------------------------------
// [STEP 2 EXERCISE]:
// Observe how wrapping `ClearingRailStatusStream` inside `<Suspense fallback={<ClearingRailSkeleton />}>`
// allows the outer dashboard shell to render immediately while the slow status streams in.
export default function StreamingTreasuryDashboard() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <h1 className="text-2xl font-serif font-bold text-stone-900">
          Live Treasury Operations
        </h1>
        <p className="text-sm text-stone-500">Fast page shell with streaming rail feed</p>
      </div>

      {/* Streaming Suspense Boundary */}
      <Suspense fallback={<ClearingRailSkeleton />}>
        <ClearingRailStatusStream />
      </Suspense>

      <section className="p-6 bg-white border border-stone-200 rounded-xl">
        <h2 className="text-lg font-semibold text-stone-900">Quick Actions</h2>
        <p className="text-sm text-stone-500 mt-1">
          Disburse funds, initiate wire batches, or review pending merchant escrow holds.
        </p>
      </section>
    </div>
  );
}
