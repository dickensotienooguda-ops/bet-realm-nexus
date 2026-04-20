import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Clock } from "lucide-react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { useState } from "react";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — BetPro" },
      { name: "description", content: "Manage your wallet, deposits and withdrawals" },
    ],
  }),
  component: WalletPage,
});

const walletTabs = [
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
  { id: "history", label: "History" },
];

const quickAmounts = [100, 200, 500, 1000, 2000, 5000, 10000];

function WalletPage() {
  const [activeTab, setActiveTab] = useState("deposit");
  const [amount, setAmount] = useState("");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/profile" className="rounded-lg bg-surface-elevated p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Wallet</h1>
        <div className="w-9" />
      </div>

      {/* Balance */}
      <div className="mx-4 mt-4 rounded-xl bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase text-muted-foreground">Your Balance</p>
          <span className="rounded border border-primary px-2 py-0.5 text-xs font-bold text-primary">M-PESA</span>
        </div>
        <p className="mt-1 text-3xl font-bold">KES 0.00</p>
      </div>

      <div className="mt-4">
        <CategoryTabs tabs={walletTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === "deposit" && (
        <div className="px-4 pt-2">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Select Amount</p>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a.toString())}
                className={`rounded-lg py-3 text-sm font-medium transition-colors ${
                  amount === a.toString() ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-foreground"
                }`}
              >
                {a >= 1000 ? `${a / 1000}K` : a}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-xs font-medium uppercase text-muted-foreground">Or Enter Custom</p>
          <div className="flex items-center rounded-lg bg-input px-3 py-3">
            <span className="text-sm font-bold text-primary">KES</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="ml-2 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Min: KES 5</span>
            <span>Max: KES 250,000</span>
          </div>

          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">
            ⚡ Enter Amount
          </button>

          {/* Paybill info */}
          <div className="mt-4 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">M</span>
              Alternative: Pay via Paybill
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Paybill Number</p>
                <p className="text-lg font-bold">562424</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Account Number</p>
                <p className="text-lg font-bold text-primary">0797585941</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "withdraw" && (
        <div className="px-4 pt-2">
          <div className="flex items-center rounded-lg bg-input px-3 py-3">
            <span className="text-sm font-bold text-primary">KES</span>
            <input
              type="number"
              placeholder="Enter withdrawal amount"
              className="ml-2 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground">
            Withdraw
          </button>
        </div>
      )}

      {activeTab === "history" && (
        <div className="flex flex-col items-center px-4 pt-12">
          <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
