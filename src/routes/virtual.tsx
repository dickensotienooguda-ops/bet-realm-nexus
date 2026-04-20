import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";
import { CategoryTabs } from "@/components/CategoryTabs";
import { Timer, Trophy, Zap, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export const Route = createFileRoute("/virtual")({
  head: () => ({
    meta: [
      { title: "Virtual Games — BetPro" },
      { name: "description", content: "Instant virtual sports with fast results" },
    ],
  }),
  component: VirtualPage,
});

const virtualTabs = [
  { id: "football", label: "Football" },
  { id: "basketball", label: "Basketball" },
  { id: "racing", label: "Racing" },
  { id: "dogs", label: "Dogs" },
];

interface VirtualMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  startsIn: number; // seconds
  odds: { home: number; draw: number; away: number };
  status: "betting" | "playing" | "finished";
  homeScore?: number;
  awayScore?: number;
}

const teamPools = {
  football: [
    ["FC Phoenix", "Dynamo City", "Red Eagles", "Blue Thunder", "Golden Lions", "Silver Stars",
     "Iron Wolves", "Storm United", "Royal Tigers", "Dark Hawks", "Green Vipers", "Arctic Bears",
     "Fire Dragons", "Ocean Sharks", "Mountain Goats", "Desert Foxes"],
  ],
  basketball: [
    ["Blaze", "Thunderbolts", "Phantoms", "Rockets", "Kings", "Warriors",
     "Titans", "Ravens", "Cobras", "Panthers", "Stallions", "Falcons"],
  ],
  racing: [
    ["Speedster", "Lightning", "Thunder", "Blaze", "Storm", "Shadow",
     "Rocket", "Comet", "Flash", "Nitro", "Fury", "Dash"],
  ],
  dogs: [
    ["Swift Paw", "Lucky Star", "Gold Rush", "Fast Track", "Hot Shot", "Wild Card",
     "Top Dog", "Front Runner", "Dark Horse", "Ace High", "Big Win", "Sure Bet"],
  ],
};

function generateVirtualMatches(sport: string, roundId: number): VirtualMatch[] {
  const teams = (teamPools as any)[sport]?.[0] || teamPools.football[0];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  const matches: VirtualMatch[] = [];
  const numMatches = Math.min(6, Math.floor(shuffled.length / 2));

  for (let i = 0; i < numMatches; i++) {
    const id = `virt-${sport}-${roundId}-${i}`;
    matches.push({
      id,
      homeTeam: shuffled[i * 2],
      awayTeam: shuffled[i * 2 + 1],
      league: `Virtual ${sport.charAt(0).toUpperCase() + sport.slice(1)} • Round ${roundId}`,
      startsIn: 60 + i * 5,
      odds: {
        home: +(1.5 + Math.random() * 3).toFixed(2),
        draw: sport === "racing" || sport === "dogs" ? 0 : +(2.5 + Math.random() * 2).toFixed(2),
        away: +(1.5 + Math.random() * 4).toFixed(2),
      },
      status: "betting",
    });
  }
  return matches;
}

function simulateResult(match: VirtualMatch): VirtualMatch {
  return {
    ...match,
    status: "finished",
    homeScore: Math.floor(Math.random() * 5),
    awayScore: Math.floor(Math.random() * 5),
  };
}

function VirtualPage() {
  const [sport, setSport] = useState("football");
  const [round, setRound] = useState(1);
  const [matches, setMatches] = useState<VirtualMatch[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [phase, setPhase] = useState<"betting" | "playing" | "results">("betting");
  const betSlip = useBetSlip();

  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  const startNewRound = useCallback(() => {
    setRound((r) => r + 1);
    setMatches(generateVirtualMatches(sport, round + 1));
    setCountdown(60);
    setPhase("betting");
  }, [sport, round]);

  useEffect(() => {
    setMatches(generateVirtualMatches(sport, round));
    setCountdown(60);
    setPhase("betting");
  }, [sport]);

  useEffect(() => {
    if (phase !== "betting") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setPhase("playing");
          // Simulate after 3s
          setTimeout(() => {
            setMatches((prev) => prev.map(simulateResult));
            setPhase("results");
          }, 3000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const handleOddsClick = (matchId: string, selection: "home" | "draw" | "away", odds: number) => {
    if (phase !== "betting") return;
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      {/* Header */}
      <div className="mx-4 mt-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="mb-1 inline-block rounded bg-background/20 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Virtual Games
            </span>
            <h2 className="text-lg font-bold text-white">Instant Results</h2>
            <p className="text-xs text-white/80">New round every 60 seconds</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Timer className="h-5 w-5 text-white" />
            </div>
            <span className="mt-1 text-xs font-bold text-white">
              {phase === "betting" ? formatTime(countdown) : phase === "playing" ? "LIVE" : "DONE"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <CategoryTabs tabs={virtualTabs} activeTab={sport} onTabChange={setSport} />
      </div>

      {/* Round info */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Round {round}</span>
        </div>
        <div className="flex items-center gap-2">
          {phase === "betting" && (
            <span className="rounded-full bg-won/10 px-2 py-0.5 text-[10px] font-bold text-won animate-pulse">
              ACCEPTING BETS
            </span>
          )}
          {phase === "playing" && (
            <span className="rounded-full bg-live/10 px-2 py-0.5 text-[10px] font-bold text-live animate-pulse">
              IN PLAY
            </span>
          )}
          {phase === "results" && (
            <button
              onClick={startNewRound}
              className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary"
            >
              <RefreshCw className="h-3 w-3" /> Next Round
            </button>
          )}
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-2 px-4">
        {matches.map((match) => (
          <div key={match.id} className="rounded-xl bg-card p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">{match.league}</span>
              {phase === "betting" && (
                <span className="text-primary font-medium">{formatTime(match.startsIn > countdown ? countdown : countdown)}</span>
              )}
              {phase === "playing" && <span className="text-live font-bold animate-pulse">LIVE</span>}
              {phase === "results" && <span className="text-muted-foreground">FT</span>}
            </div>

            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{match.homeTeam}</span>
                {phase !== "betting" && <span className="text-sm font-bold">{match.homeScore ?? 0}</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{match.awayTeam}</span>
                {phase !== "betting" && <span className="text-sm font-bold">{match.awayScore ?? 0}</span>}
              </div>
            </div>

            {/* Odds row */}
            <div className={`grid gap-2 ${match.odds.draw ? "grid-cols-3" : "grid-cols-2"}`}>
              {(["home", ...(match.odds.draw ? ["draw"] : []), "away"] as const).map((sel) => {
                const key = getSelectionKey(match.id, sel);
                const isSelected = selectedKeys.has(key);
                const selOdds = match.odds[sel as keyof typeof match.odds];
                if (!selOdds) return null;

                // Show result styling
                let resultClass = "";
                if (phase === "results" && match.homeScore !== undefined && match.awayScore !== undefined) {
                  const winner = match.homeScore > match.awayScore ? "home" : match.awayScore > match.homeScore ? "away" : "draw";
                  if (sel === winner) resultClass = "border-won text-won";
                }

                return (
                  <button
                    key={sel}
                    onClick={() => handleOddsClick(match.id, sel as "home" | "draw" | "away", selOdds)}
                    disabled={phase !== "betting"}
                    className={`odds-btn ${isSelected ? "selected" : ""} ${resultClass} disabled:opacity-50`}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground">
                        {sel === "home" ? "1" : sel === "draw" ? "X" : "2"}
                      </span>
                      <span>{selOdds.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
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
