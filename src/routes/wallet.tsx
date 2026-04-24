import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Clock, Loader2 } from "lucide-react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { getWallet, getTransactions } from "@/lib/user.functions";
import { supabase } from "@/integrations/supabase/client";

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
  const { session, user } = useAuth();
  const [activeTab, setActiveTab] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [currency, setCurrency] = useState("KES");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [depositMsg, setDepositMsg] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [pendingCheckoutId, setPendingCheckoutId] = useState<string | null>(null);

  // Pre-fill phone from profile metadata when available
  useEffect(() => {
    const p = user?.user_metadata?.phone || user?.phone;
    if (p && !phone) setPhone(String(p));
  }, [user]);

  useEffect(() => {
    if (!session) return;
    getWallet({ data: undefined as never, headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((res) => {
        if (res.wallet) {
          setBalance(Number(res.wallet.balance).toFixed(2));
          setCurrency(res.wallet.currency_code);
        }
      });
  }, [session]);

  useEffect(() => {
    if (!session || activeTab !== "history") return;
    setLoadingTx(true);
    getTransactions({ data: undefined as never, headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((res) => {
        setTransactions(res.transactions || []);
        setLoadingTx(false);
      });
  }, [session, activeTab]);

  const refreshBalance = async () => {
    if (!session) return;
    const res = await getWallet({ data: undefined as never, headers: { Authorization: `Bearer ${session.access_token}` } });
    if (res.wallet) setBalance(Number(res.wallet.balance).toFixed(2));
  };

  const handleDeposit = async () => {
    if (!session || !amount || depositing) return;
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      setDepositMsg("Enter a valid M-PESA phone number");
      return;
    }
    setDepositing(true);
    setDepositMsg("Sending STK push to your phone…");
    try {
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: parseFloat(amount), phone_number: phone }),
      });
      const data = await res.json();
      if (!data.success) {
        setDepositMsg(data.error || "Deposit failed");
        setDepositing(false);
        return;
      }
      setPendingCheckoutId(data.checkout_id);
      setDepositMsg(data.message || "Check your phone and enter your M-PESA PIN");
    } catch (err: any) {
      setDepositMsg(err?.message || "Network error");
      setDepositing(false);
    }
  };

  // Poll for status while a deposit is pending
  useEffect(() => {
    if (!pendingCheckoutId || !session) return;
    let attempts = 0;
    const maxAttempts = 40; // ~2 minutes at 3s
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/deposit-status?checkout_id=${pendingCheckoutId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.status === "successful") {
          clearInterval(interval);
          setDepositMsg(`Deposited ${currency} ${amount} successfully!`);
          if (data.balance != null) setBalance(Number(data.balance).toFixed(2));
          else refreshBalance();
          setAmount("");
          setPendingCheckoutId(null);
          setDepositing(false);
        } else if (data.status === "failed") {
          clearInterval(interval);
          setDepositMsg("Payment failed or was cancelled");
          setPendingCheckoutId(null);
          setDepositing(false);
        }
      } catch {
        /* ignore */
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setDepositMsg("Timed out waiting for payment. Check your transactions.");
        setPendingCheckoutId(null);
        setDepositing(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [pendingCheckoutId, session]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link to="/profile" className="rounded-lg bg-surface-elevated p-2"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold">Wallet</h1>
          <div className="w-9" />
        </div>
        <div className="flex flex-col items-center px-4 pt-20">
          <p className="text-sm text-muted-foreground">Login to access your wallet</p>
          <Link to="/login" className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Login</Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/profile" className="rounded-lg bg-surface-elevated p-2"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">Wallet</h1>
        <div className="w-9" />
      </div>

      <div className="mx-4 mt-4 rounded-xl bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase text-muted-foreground">Your Balance</p>
          <span className="rounded border border-primary px-2 py-0.5 text-xs font-bold text-primary">M-PESA</span>
        </div>
        <p className="mt-1 text-3xl font-bold">{currency} {balance}</p>
      </div>

      <div className="mt-4">
        <CategoryTabs tabs={walletTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {depositMsg && (
        <div className="mx-4 mt-2 rounded-xl bg-won/10 p-3 text-sm font-medium text-won">{depositMsg}</div>
      )}

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
            <span className="text-sm font-bold text-primary">{currency}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="ml-2 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Min: {currency} 10</span>
            <span>Max: {currency} 250,000</span>
          </div>

          <p className="mb-2 mt-4 text-xs font-medium uppercase text-muted-foreground">M-PESA Phone Number</p>
          <div className="flex items-center rounded-lg bg-input px-3 py-3">
            <span className="text-sm font-bold text-primary">+254</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              disabled={depositing}
              className="ml-2 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>

          <button
            onClick={handleDeposit}
            disabled={depositing || !amount || !phone}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {depositing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for payment…</>
            ) : (
              <>⚡ Deposit {amount ? `${currency} ${amount}` : ""}</>
            )}
          </button>

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
                <p className="text-lg font-bold text-primary">{user?.user_metadata?.phone || "0797585941"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "withdraw" && (
        <div className="px-4 pt-2">
          <div className="flex items-center rounded-lg bg-input px-3 py-3">
            <span className="text-sm font-bold text-primary">{currency}</span>
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
        <div className="px-4 pt-2">
          {loadingTx && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {!loadingTx && transactions.length === 0 && (
            <div className="flex flex-col items-center pt-12">
              <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          )}
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-3 border-b border-border py-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                Number(tx.amount) > 0 ? "bg-won/10" : "bg-destructive/10"
              }`}>
                {Number(tx.amount) > 0
                  ? <ArrowDownLeft className="h-4 w-4 text-won" />
                  : <ArrowUpRight className="h-4 w-4 text-destructive" />
                }
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium capitalize">{tx.type}</p>
                <p className="text-xs text-muted-foreground">{tx.description || tx.reference}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${Number(tx.amount) > 0 ? "text-won" : "text-destructive"}`}>
                  {Number(tx.amount) > 0 ? "+" : ""}{currency} {Math.abs(Number(tx.amount)).toFixed(2)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
