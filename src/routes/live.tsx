import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { MatchCard, type MatchData } from "@/components/MatchCard";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";
import { Loader2, RefreshCw, Wifi } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Matches — BetPro" },
      { name: "description", content: "Bet on live matches in real-time" },
    ],
  }),
  component: LivePage,
});

const POLL_INTERVAL = 15_000; // 15 seconds

function LivePage() {
  const betSlip = useBetSlip();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  const loadMatches = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setIsPolling(true);
    try {
      const response = await fetch("/api/fixtures?live=true");
      const result = await response.json();
      const liveMatches = (result.matches || []) as MatchData[];
      setMatches(liveMatches);
      setLastUpdated(new Date());
    } catch {
      // keep existing matches on error
    }
    setLoading(false);
    setIsPolling(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadMatches(true);
  }, [loadMatches]);

  // Auto-poll every 30s
  useEffect(() => {
    pollRef.current = setInterval(() => loadMatches(false), POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadMatches]);

  const handleOddsClick = (matchId: string, selection: "home" | "draw" | "away", odds: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    addSelection({
      matchId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      selectionType: selection,
      selectionLabel: selection === "home" ? match.homeTeam : selection === "draw" ? "Draw" : match.awayTeam,
      odds,
    });
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return "";
    const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (secs < 10) return "Just now";
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      {/* Header with live indicator */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-live" />
        <h1 className="text-lg font-bold">Live Games</h1>
        <div className="ml-auto flex items-center gap-2">
          {/* Live polling indicator */}
          <div className="flex items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-1">
            <Wifi className={`h-3 w-3 ${isPolling ? "text-won animate-pulse" : "text-primary"}`} />
            <span className="text-[10px] text-muted-foreground">{formatLastUpdated()}</span>
          </div>
          <button
            onClick={() => loadMatches(false)}
            disabled={isPolling}
            className="rounded-full bg-surface-elevated p-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>


      {/* Odds header */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>LIVE ODDS</span>
        <div className="flex gap-6">
          <span>1</span>
          <span>X</span>
          <span>2</span>
        </div>
      </div>

      <div className="space-y-2 px-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {!loading && matches.length === 0 && (
          <div className="rounded-xl bg-card p-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
              <Wifi className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No live matches right now</p>
            <p className="mt-1 text-xs text-muted-foreground">Check back during match hours</p>
            <button
              onClick={() => loadMatches(true)}
              className="mt-4 rounded-xl bg-primary px-6 py-2 text-sm font-bold text-primary-foreground"
            >
              Refresh Now
            </button>
          </div>
        )}
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onOddsClick={handleOddsClick}
            selectedSelections={selectedKeys}
          />
        ))}
      </div>

      {/* Floating betslip */}
      {betSlip.selections.length > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-40 mx-auto max-w-lg">
          <Link to="/betslip" className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 shadow-lg glow-emerald">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-sm font-bold text-primary">
                {betSlip.selections.length}
              </span>
              <span className="text-sm font-bold text-primary-foreground">
                {betSlip.selections.reduce((a, s) => a * s.odds, 1).toFixed(2)} ODDS
              </span>
            </div>
            <span className="rounded-lg bg-primary-foreground px-4 py-1.5 text-sm font-bold text-primary">
              BET &gt;
            </span>
          </Link>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
