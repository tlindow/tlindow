// ============================================================================
// STEP 3 EXERCISE: Server Actions & Optimistic UI Updates (`useOptimistic`)
// ============================================================================
// Scenario:
// When a merchant disburses funds to their bank account, waiting 1-2 seconds
// for the server response feels sluggish.
//
// By using React's `useOptimistic` hook paired with Next.js Server Actions,
// we can update the balance and transaction feed instantly on click,
// while the server processes the database write and bank API dispatch in the background.
//
// 🎯 Learning Objectives:
// - Write type-safe Server Actions with `"use server"`.
// - Pair Server Actions with React's `useOptimistic` hook.
// - Handle mutation errors gracefully with automatic optimistic rollback.
// ============================================================================

"use client";

import React, { useOptimistic, useTransition, useState } from "react";

export interface PayoutTransaction {
  id: string;
  amountCents: number;
  recipientAccount: string;
  status: "PENDING" | "SETTLED" | "FAILED";
  timestamp: string;
}

// ----------------------------------------------------------------------------
// 1. Server Action Definition (Normally in a separate actions.ts file)
// ----------------------------------------------------------------------------
// Simulating the server action:
async function disbursePayoutServerAction(
  amountCents: number,
  recipientAccount: string
): Promise<PayoutTransaction> {
  // Simulate network latency & server validation
  await new Promise((resolve) => setTimeout(resolve, 800));

  if (amountCents <= 0) {
    throw new Error("Payout amount must be greater than zero.");
  }

  return {
    id: `tx_${Date.now()}`,
    amountCents,
    recipientAccount,
    status: "SETTLED",
    timestamp: new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// 2. Client Component with useOptimistic
// ----------------------------------------------------------------------------
// [STEP 3 EXERCISE]:
// Follow the pattern below to add optimistic items to the feed and handle transitions.
export function OptimisticPayoutWidget({
  initialTransactions,
}: {
  initialTransactions: PayoutTransaction[];
}) {
  const [transactions, setTransactions] = useState<PayoutTransaction[]>(initialTransactions);
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState<number>(500);

  // useOptimistic hook computes temporary state while the Server Action is in-flight:
  const [optimisticTransactions, addOptimisticTransaction] = useOptimistic(
    transactions,
    (state, newTx: PayoutTransaction) => [newTx, ...state]
  );

  const handleDisburse = () => {
    const tempTx: PayoutTransaction = {
      id: `temp_${Date.now()}`,
      amountCents: amount * 100,
      recipientAccount: "Chase Business (•••4819)",
      status: "PENDING",
      timestamp: new Date().toISOString(),
    };

    startTransition(async () => {
      // 1. Immediately apply optimistic item to UI
      addOptimisticTransaction(tempTx);

      try {
        // 2. Execute actual Server Action
        const settledTx = await disbursePayoutServerAction(tempTx.amountCents, tempTx.recipientAccount);
        // 3. Commit permanent state
        setTransactions((prev) => [settledTx, ...prev]);
      } catch (err) {
        console.error("Payout failed, rolling back optimistic state:", err);
      }
    });
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white border border-stone-200 rounded-2xl space-y-4">
      <h3 className="font-semibold text-stone-900 text-lg">Instant Payout Disbursement</h3>

      <div className="flex items-center gap-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="border border-stone-300 rounded-lg px-3 py-2 text-stone-900 w-32 font-mono text-sm"
          placeholder="Amount"
        />
        <button
          onClick={handleDisburse}
          disabled={isPending}
          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition"
        >
          {isPending ? "Disbursing..." : `Disburse $${amount}`}
        </button>
      </div>

      <div className="border-t border-stone-100 pt-3">
        <p className="text-xs text-stone-500 mb-2 font-medium">Recent Transactions</p>
        <ul className="space-y-2">
          {optimisticTransactions.map((tx) => (
            <li
              key={tx.id}
              className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-stone-50 border border-stone-200/60"
            >
              <div>
                <span className="font-mono font-medium text-stone-800">
                  ${(tx.amountCents / 100).toFixed(2)}
                </span>
                <span className="text-stone-400 ml-2">{tx.recipientAccount}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  tx.status === "PENDING"
                    ? "bg-amber-100 text-amber-800 animate-pulse"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {tx.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
