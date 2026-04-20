import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, Users, CreditCard, BarChart3, Settings, Loader2, Gavel } from "lucide-react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { settleOpenBets } from "@/lib/settlement.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — BetPro" },
      { name: "description", content: "Manage users, bets, and transactions" },
    ],
  }),
  component: AdminPage,
});

const adminTabs = [
  { id: "users", label: "Users" },
  { id: "bets", label: "Bets" },
  { id: "transactions", label: "Transactions" },
  { id: "settings", label: "Settings" },
];

function AdminPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, bets: 0, transactions: 0, totalWagered: 0 });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin?tab=${activeTab}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res.data || []);
        if (res.stats) setStats(res.stats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/" className="rounded-lg bg-surface-elevated p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">Admin Panel</h1>
        <div className="w-9" />
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-4">
        {[
          { label: "Users", value: stats.users, icon: Users, color: "text-primary" },
          { label: "Bets", value: stats.bets, icon: BarChart3, color: "text-pending" },
          { label: "Transactions", value: stats.transactions, icon: CreditCard, color: "text-won" },
          { label: "Total Wagered", value: `KES ${stats.totalWagered.toLocaleString()}`, icon: Settings, color: "text-destructive" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card p-3">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="mt-1 text-lg font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <CategoryTabs tabs={adminTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="px-4 pt-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && activeTab === "users" && (
          <div className="space-y-2">
            {data.map((user: any) => (
              <div key={user.id} className="rounded-xl bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{user.phone || user.display_name || "No phone"}</p>
                    <p className="text-xs text-muted-foreground">ID: {user.user_id?.slice(0, 8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs ${user.is_verified ? "text-won" : "text-muted-foreground"}`}>
                      {user.is_verified ? "Verified" : "Unverified"}
                    </p>
                    <p className={`text-xs ${user.is_suspended ? "text-destructive" : "text-muted-foreground"}`}>
                      {user.is_suspended ? "Suspended" : "Active"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === "bets" && (
          <div className="space-y-2">
            {data.map((bet: any) => (
              <div key={bet.id} className="rounded-xl bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{bet.bet_type} — {bet.status}</p>
                    <p className="text-xs text-muted-foreground">
                      Stake: KES {Number(bet.stake).toFixed(2)} | Odds: {Number(bet.total_odds).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">KES {Number(bet.potential_payout).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(bet.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === "transactions" && (
          <div className="space-y-2">
            {data.map((tx: any) => (
              <div key={tx.id} className="rounded-xl bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium capitalize">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{tx.status} — {tx.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${Number(tx.amount) > 0 ? "text-won" : "text-destructive"}`}>
                      KES {Math.abs(Number(tx.amount)).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && activeTab === "settings" && (
          <SettlementSettings />
        )}

        {!loading && data.length === 0 && activeTab !== "settings" && (
          <div className="py-12 text-center text-sm text-muted-foreground">No data yet</div>
        )}
      </div>
    </div>
  );
}

function SettlementSettings() {
  const [settling, setSettling] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSettle = async () => {
    setSettling(true);
    setResult(null);
    try {
      const res = await settleOpenBets();
      setResult(res);
    } catch (err: any) {
      setResult({ errors: [err.message] });
    }
    setSettling(false);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-card p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Gavel className="h-4 w-4 text-primary" /> Settlement Engine
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Check finished matches and settle open bets. Pays out winners automatically.
        </p>
        <button
          onClick={handleSettle}
          disabled={settling}
          className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          {settling ? "Settling..." : "Run Settlement Now"}
        </button>
        {result && (
          <div className="mt-3 rounded-lg bg-surface-elevated p-3 text-xs space-y-1">
            <p>Settled: <span className="font-bold">{result.settledBets ?? 0}</span> bets</p>
            <p>Paid out: <span className="font-bold text-won">{result.paidOut ?? 0}</span> winners</p>
            <p>Total payout: <span className="font-bold text-won">KES {(result.totalPayout ?? 0).toLocaleString()}</span></p>
            {result.errors?.length > 0 && (
              <div className="mt-1 text-destructive">
                {result.errors.map((e: string, i: number) => <p key={i}>⚠ {e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="rounded-xl bg-card p-4">
        <h3 className="text-sm font-semibold">Countries</h3>
        <p className="text-xs text-muted-foreground">KE (Kenya), NG (Nigeria), TZ (Tanzania)</p>
      </div>
      <div className="rounded-xl bg-card p-4">
        <h3 className="text-sm font-semibold">VIP Tiers</h3>
        <p className="text-xs text-muted-foreground">Bronze → Silver → Gold → Platinum → Elite</p>
      </div>
      <div className="rounded-xl bg-card p-4">
        <h3 className="text-sm font-semibold">Payment Methods</h3>
        <p className="text-xs text-muted-foreground">M-PESA, Airtel Money, OPay, Tigo Pesa, Bank Transfer</p>
      </div>
    </div>
  );
}
