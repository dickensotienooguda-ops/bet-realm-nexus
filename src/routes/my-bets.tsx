import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { useAuth } from "@/lib/auth-context";
import { getUserBets } from "@/lib/user.functions";
import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/my-bets")({
  head: () => ({
    meta: [
      { title: "My Bets — BetPro" },
      { name: "description", content: "View your active, settled and cancelled bets" },
    ],
  }),
  component: MyBetsPage,
});

const betTabs = [
  { id: "active", label: "Active" },
  { id: "settled", label: "Settled" },
  { id: "all", label: "All" },
];

function MyBetsPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState("active");
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    getUserBets({
      data: { status: activeTab === "all" ? undefined : activeTab },
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => {
        setBets(res.bets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session, activeTab]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "won": return <CheckCircle className="h-4 w-4 text-won" />;
      case "lost": return <XCircle className="h-4 w-4 text-lost" />;
      default: return <Clock className="h-4 w-4 text-pending" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "text-won";
      case "lost": return "text-lost";
      default: return "text-pending";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      <div className="px-4 py-3">
        <h1 className="text-lg font-bold">My Bets</h1>
      </div>

      <CategoryTabs tabs={betTabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {!session && (
        <div className="flex flex-col items-center px-4 pt-20">
          <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Login to see your bets</p>
          <Link to="/login" className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Login</Link>
        </div>
      )}

      {session && loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {session && !loading && bets.length === 0 && (
        <div className="flex flex-col items-center px-4 pt-20">
          <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No bets yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Your bets will appear here</p>
        </div>
      )}

      {session && !loading && bets.length > 0 && (
        <div className="space-y-2 px-4 pt-2">
          {bets.map((bet) => (
            <div key={bet.id} className="rounded-xl bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(bet.status)}
                  <span className={`text-xs font-semibold uppercase ${getStatusColor(bet.status)}`}>
                    {bet.status}
                  </span>
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {bet.bet_type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(bet.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Selections */}
              {bet.bet_selections?.map((sel: any) => (
                <div key={sel.id} className="mt-2 border-t border-border pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{sel.outcome_label || sel.outcome_key}</span>
                    <span className="font-bold text-primary">{Number(sel.odds).toFixed(2)}</span>
                  </div>
                </div>
              ))}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Stake: </span>
                  <span className="text-sm font-bold">KES {Number(bet.stake).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Payout: </span>
                  <span className={`text-sm font-bold ${bet.status === "won" ? "text-won" : ""}`}>
                    KES {Number(bet.potential_payout).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
