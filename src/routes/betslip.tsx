import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { useBetSlip, removeSelection, setStake, clearSlip, getTotalOdds, getPotentialPayout } from "@/lib/betslip-store";
import { ShoppingCart, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { placeBet } from "@/lib/betting.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/betslip")({
  head: () => ({
    meta: [
      { title: "Betslip — BetPro" },
      { name: "description", content: "Review and place your bets" },
    ],
  }),
  component: BetslipPage,
});

function BetslipPage() {
  const betSlip = useBetSlip();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [stakeInput, setStakeInput] = useState(betSlip.stake > 0 ? betSlip.stake.toString() : "");
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const totalOdds = getTotalOdds(betSlip.selections);
  const stake = parseFloat(stakeInput) || 0;
  const payout = getPotentialPayout(betSlip.selections, stake);

  const handleStakeChange = (value: string) => {
    setStakeInput(value);
    setStake(parseFloat(value) || 0);
  };

  const quickStakes = [100, 200, 500, 1000, 2000, 5000];

  const handlePlaceBet = async () => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (stake <= 0 || betSlip.selections.length === 0) return;

    setPlacing(true);
    setResult(null);

    try {
      // We need market IDs — for now create placeholder markets in DB via admin
      // For the MVP, we'll create markets on-the-fly if they don't exist
      const token = session.access_token;

      const selectionsData = betSlip.selections.map((s) => ({
        matchId: s.matchId || "00000000-0000-0000-0000-000000000000",
        marketId: s.marketId || "00000000-0000-0000-0000-000000000000",
        outcomeKey: s.selectionType,
        outcomeLabel: s.selectionLabel,
        odds: s.odds,
      }));

      const res = await placeBet({
        data: { selections: selectionsData, stake },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.success) {
        setResult({ success: true, message: `Bet placed! New balance: ${res.newBalance}` });
        clearSlip();
      } else {
        setResult({ success: false, message: res.error || "Failed to place bet" });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Error placing bet" });
    }

    setPlacing(false);
  };

  if (betSlip.selections.length === 0 && !result) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        <div className="flex flex-col items-center justify-center px-4 pt-32">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-muted/20">
            <ShoppingCart className="h-10 w-10 text-emerald-muted" />
          </div>
          <h2 className="text-lg font-semibold">Your betslip is empty</h2>
          <p className="mt-1 text-sm text-muted-foreground">Add selections by clicking on odds</p>
          <Link to="/" className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground">
            Browse Matches
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Betslip</h1>
          <button onClick={clearSlip} className="flex items-center gap-1 text-xs text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Clear All
          </button>
        </div>

        {/* Result message */}
        {result && (
          <div className={`mt-3 rounded-xl p-3 text-sm font-medium ${result.success ? "bg-won/10 text-won" : "bg-destructive/10 text-destructive"}`}>
            {result.message}
          </div>
        )}

        {/* Selections */}
        <div className="mt-3 space-y-2">
          {betSlip.selections.map((sel) => (
            <div key={`${sel.matchId}-${sel.selectionType}`} className="rounded-xl bg-card p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{sel.league}</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {sel.homeTeam} vs {sel.awayTeam}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {sel.selectionLabel}
                    </span>
                    <span className="text-sm font-bold text-primary">{sel.odds.toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => removeSelection(sel.matchId)} className="p-1 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Stake input */}
        <div className="mt-4 rounded-xl bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Enter Stake</p>
          <div className="flex items-center rounded-lg bg-input px-3 py-2.5">
            <span className="text-sm font-bold text-primary">KES</span>
            <input
              type="number"
              value={stakeInput}
              onChange={(e) => handleStakeChange(e.target.value)}
              placeholder="0"
              className="ml-2 flex-1 bg-transparent text-lg font-bold outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {quickStakes.map((qs) => (
              <button
                key={qs}
                onClick={() => handleStakeChange(qs.toString())}
                className="rounded-lg bg-surface-elevated px-2 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface-highlight"
              >
                {qs >= 1000 ? `${qs / 1000}K` : qs}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 space-y-2 rounded-xl bg-card p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Selections</span>
            <span className="font-medium">{betSlip.selections.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Odds</span>
            <span className="font-bold text-primary">{totalOdds.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Potential Payout</span>
            <span className="font-bold text-won">KES {payout.toFixed(2)}</span>
          </div>
        </div>

        {/* Place bet button */}
        <button
          onClick={handlePlaceBet}
          disabled={stake <= 0 || placing}
          className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {placing ? "Placing..." : !session ? "Login to Place Bet" : `Place Bet — KES ${stake.toFixed(2)}`}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
