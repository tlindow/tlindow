// ============================================================================
// STEP 1 EXERCISE: React Server Components (RSC) & Data Fetching Boundary
// ============================================================================
// Scenario:
// You are building a high-security Treasury Dashboard page in Next.js App Router.
// The page needs to:
// 1. Fetch sensitive account balances and merchant risk scores on the server
//    (never leaking DB credentials or secret API tokens to the client bundle).
// 2. Pass serialized data down to a lightweight, interactive client widget.
//
// 🎯 Learning Objectives:
// - Understand what code runs exclusively on the server vs in the browser.
// - Practice designing async Server Components that fetch data directly.
// - Establish clean props boundaries across RSC -> Client Component borders.
// ============================================================================

import React from "react";

// Types
export interface TreasuryAccount {
  id: string;
  accountName: string;
  currency: "USD" | "EUR" | "GBP";
  availableBalanceCents: bigint;
  pendingDisbursementsCents: bigint;
  lastAuditedAt: string;
}

// ----------------------------------------------------------------------------
// 1. Server-Side Data Fetcher (Mock Database / Secure Internal API)
// ----------------------------------------------------------------------------
// Note: In real applications, this function might use Prisma, Drizzle, or a secure gRPC client.
async function getTreasuryAccountData(merchantId: string): Promise<TreasuryAccount> {
  // Simulate secure database retrieval
  return {
    id: `acc_${merchantId}`,
    accountName: "Primary Settlement Escrow",
    currency: "USD",
    availableBalanceCents: BigInt(450_000_000), // $4.5M USD
    pendingDisbursementsCents: BigInt(12_500_00), // $12.5K USD
    lastAuditedAt: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// 2. Client Component Stub (Interactive UI)
// ----------------------------------------------------------------------------
// In Next.js, interactive state (useState, useEffect, event listeners, framer-motion)
// requires the `"use client"` directive at the top of the file.
//
// [STEP 1.1 EXERCISE]:
// Notice that BigInt is not natively serializable across the RSC boundary by default.
// How would you serialize or format the balance before sending it across to the client?
export interface ClientBalanceCardProps {
  accountName: string;
  formattedBalance: string;
  currency: string;
}

export function ClientBalanceCard({
  accountName,
  formattedBalance,
  currency,
}: ClientBalanceCardProps) {
  return (
    <div className="p-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
      <p className="text-xs uppercase tracking-wider text-stone-500 font-mono">
        {accountName}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-stone-900 tracking-tight">
          {formattedBalance}
        </span>
        <span className="text-sm font-medium text-stone-500">{currency}</span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. The Server Component (Page Shell)
// ----------------------------------------------------------------------------
// [STEP 1.2 EXERCISE]:
// Complete the async Server Component below to fetch the account data, format the currency,
// and render the client balance card.
export default async function TreasuryPage({
  params,
}: {
  params: Promise<{ merchantId: string }>;
}) {
  const { merchantId } = await params;
  const account = await getTreasuryAccountData(merchantId);

  // Format currency into a human-readable string on the server:
  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: account.currency,
  }).format(Number(account.availableBalanceCents) / 100);

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-serif font-bold text-stone-900">
          Treasury & Settlement Overview
        </h1>
        <p className="text-sm text-stone-500">Merchant Account: {merchantId}</p>
      </header>

      {/* Render the interactive Client Component with serialized props */}
      <ClientBalanceCard
        accountName={account.accountName}
        formattedBalance={formattedBalance}
        currency={account.currency}
      />
    </main>
  );
}
