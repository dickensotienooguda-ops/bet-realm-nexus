import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MatchCard, type MatchData } from "@/components/MatchCard";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";
import { Trophy, Zap, Star, Monitor } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BetPro — Home" },
      { name: "description", content: "Browse matches, place bets, and win big" },
    ],
  }),
  component: HomePage,
});

const sportsTabs = [
  { id: "soccer", label: "Soccer", count: 142 },
  { id: "basketball", label: "Basketball", count: 38 },
  { id: "tennis", label: "Tennis", count: 24 },
  { id: "cricket", label: "Cricket", count: 12 },
];

const quickLinks = [
  { icon: Zap, label: "Aviator", color: "bg-destructive" },
  { icon: Star, label: "Featured", color: "bg-surface-elevated" },
  { icon: Monitor, label: "Live Game", color: "bg-surface-elevated" },
  { icon: Trophy, label: "Ligi Kuu", color: "bg-surface-elevated" },
];

// Mock matches for initial display (static times to avoid hydration mismatch)
const mockMatches: MatchData[] = [
  {
    id: "m1",
    homeTeam: "Gor Mahia",
    awayTeam: "AFC Leopards",
    league: "Kenya • KPL",
    kickOff: "19:45",
    kickOffDisplay: "19:45",
    status: "upcoming",
    markets: 86,
    odds: { home: 2.10, draw: 3.20, away: 3.50 },
  },
  {
    id: "m2",
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    league: "England • Premier League",
    kickOff: "21:00",
    kickOffDisplay: "21:00",
    status: "upcoming",
    markets: 240,
    odds: { home: 3.60, draw: 3.30, away: 2.17 },
  },
  {
    id: "m3",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    league: "Spain • La Liga",
    kickOff: "LIVE",
    kickOffDisplay: "LIVE",
    status: "live",
    homeScore: 1,
    awayScore: 0,
    markets: 180,
    odds: { home: 1.85, draw: 3.60, away: 4.10 },
  },
  {
    id: "m4",
    homeTeam: "PSG",
    awayTeam: "Marseille",
    league: "France • Ligue 1",
    kickOff: "22:00",
    kickOffDisplay: "22:00",
    status: "upcoming",
    markets: 156,
    odds: { home: 1.55, draw: 4.20, away: 5.50 },
  },
];

function HomePage() {
  const betSlip = useBetSlip();
  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  const handleOddsClick = (matchId: string, selection: "home" | "draw" | "away", odds: number) => {
    const match = mockMatches.find((m) => m.id === matchId);
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar balance="0.00" currency="KES" />

      {/* Promo banner */}
      <div className="mx-4 mt-3 rounded-xl gradient-emerald p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="mb-1 inline-block rounded bg-background/20 px-2 py-0.5 text-[10px] font-bold uppercase">
              Sportsbook
            </span>
            <h2 className="text-lg font-bold text-primary-foreground">25% CASHBACK</h2>
            <p className="text-xs text-primary-foreground/80">On all sportsbook losses</p>
          </div>
          <button className="rounded-lg bg-background px-4 py-2 text-sm font-bold text-foreground">
            Bet Now →
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 overflow-x-auto px-4 py-4">
        {quickLinks.map((link) => (
          <div key={link.label} className="flex flex-col items-center gap-1.5">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${link.color}`}>
              <link.icon className="h-6 w-6" />
            </div>
            <span className="text-[11px] text-muted-foreground">{link.label}</span>
          </div>
        ))}
      </div>

      {/* Sport filter tabs */}
      <CategoryTabs tabs={sportsTabs} />

      {/* Matches header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <h3 className="text-sm font-semibold">Popular</h3>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Odds</span>
          <span>1</span>
          <span>X</span>
          <span>2</span>
        </div>
      </div>

      {/* Match list */}
      <div className="space-y-2 px-4">
        {mockMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onOddsClick={handleOddsClick}
            selectedSelections={selectedKeys}
          />
        ))}
      </div>

      {/* Floating bet counter */}
      {betSlip.selections.length > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-40 mx-auto max-w-lg">
          <a href="/betslip" className="flex items-center justify-between rounded-xl bg-primary px-4 py-3 shadow-lg glow-emerald">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground text-sm font-bold text-primary">
                {betSlip.selections.length}
              </span>
              <span className="text-sm font-bold text-primary-foreground">
                {(betSlip.selections.reduce((a, s) => a * s.odds, 1)).toFixed(2)} ODDS
              </span>
            </div>
            <span className="rounded-lg bg-primary-foreground px-4 py-1.5 text-sm font-bold text-primary">
              BET &gt;
            </span>
          </a>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
