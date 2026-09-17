// ============================================================================
// STEP 4 EXERCISE: Next.js Data Cache & Tag-Based Revalidation
// ============================================================================
// Scenario:
// Treasury balances and merchant fee schedules change infrequently, but when a
// new settlement clears, we need deterministic, immediate cache invalidation.
//
// Instead of setting low time-based cache TTLs (e.g. revalidate: 10),
// Next.js provides tag-based on-demand revalidation via `revalidateTag()`.
//
// 🎯 Learning Objectives:
// - Use `next: { tags: [...] }` to tag cached fetch requests.
// - Call `revalidateTag()` inside mutation Server Actions.
// - Compare `revalidatePath` vs `revalidateTag` granularity.
// ============================================================================

import { revalidateTag, revalidatePath } from "next/cache";

export interface FeeSchedule {
  merchantId: string;
  basisPoints: number;
  fixedFeeCents: number;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 1. Tagged Data Fetching
// ----------------------------------------------------------------------------
export async function getCachedFeeSchedule(merchantId: string): Promise<FeeSchedule> {
  // In Next.js App Router, fetch requests can be tagged for on-demand invalidation:
  const res = await fetch(`https://api.internal-fintech.local/merchants/${merchantId}/fees`, {
    next: {
      tags: [`merchant:${merchantId}:fees`, "treasury:all-fees"],
    },
  });

  if (!res.ok) {
    // Fallback mock
    return {
      merchantId,
      basisPoints: 290, // 2.9%
      fixedFeeCents: 30, // $0.30
      updatedAt: new Date().toISOString(),
    };
  }

  return res.json();
}

// ----------------------------------------------------------------------------
// 2. Server Action with Tag Invalidation
// ----------------------------------------------------------------------------
// [STEP 4 EXERCISE]:
// Observe how `updateFeeScheduleAction` triggers targeted cache purge for ONLY
// the specific merchant's fee cache tag without invalidating unrelated dashboard pages.
export async function updateFeeScheduleAction(
  merchantId: string,
  newBasisPoints: number,
  newFixedFeeCents: number
) {
  "use server";

  // 1. Perform database mutation
  console.log(`Updating fees for merchant ${merchantId}: ${newBasisPoints} bps, ${newFixedFeeCents}c`);

  // 2. Revalidate only the specific merchant's fee cache tag:
  revalidateTag(`merchant:${merchantId}:fees`);

  // 3. Or revalidate the entire treasury dashboard route if layout changes:
  // revalidatePath("/dashboard/treasury");

  return { success: true, timestamp: new Date().toISOString() };
}
