import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { MatchCard, type MatchData } from "@/components/MatchCard";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Matches — BetPro" },
      { name: "description", content: "Bet on live matches in real-time" },
    ],
  }),
  component: LivePage,
});

const liveMatches: MatchData[] = [
  {
    id: "l1",
    homeTeam: "Kortrijk U21",
    awayTeam: "Francs Borains",
    league: "Belgium • Beloften Pro League",
    kickOff: new Date().toISOString(),
    status: "live",
    homeScore: 0,
    awayScore: 0,
    markets: 8,
    odds: { home: 1.30, draw: 5.25, away: 8.50 },
  },
  {
    id: "l2",
    homeTeam: "Gazişehir Gaziantep",
    awayTeam: "Kayserispor",
    league: "Turkey • Super Lig",
    kickOff: new Date().toISOString(),
    status: "live",
    homeScore: 1,
    awayScore: 0,
    markets: 19,
    odds: { home: 1.45, draw: 4.10, away: 6.50 },
  },
];

const marketTabs = ["1×2 / Winner", "Over/Under", "GG/NG", "Double Chance"];

function LivePage() {
  const betSlip = useBetSlip();
  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  const handleOddsClick = (matchId: string, selection: "home" | "draw" | "away", odds: number) => {
    const match = liveMatches.find((m) => m.id === matchId);
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

      <div className="flex items-center gap-3 px-4 py-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-live" />
        <h1 className="text-lg font-bold">Live Games</h1>
        <div className="ml-auto flex gap-2">
          <button className="rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium">Highlights</button>
          <button className="rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-medium">Sort By ↓</button>
        </div>
      </div>

      {/* Market type tabs */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {marketTabs.map((tab, i) => (
          <button
            key={tab}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
              i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Odds header */}
      <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
        <span>ODDS</span>
        <div className="flex gap-6">
          <span>MARKETS</span>
          <span>1</span>
          <span>X</span>
          <span>2</span>
        </div>
      </div>

      <div className="space-y-2 px-4">
        {liveMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onOddsClick={handleOddsClick}
            selectedSelections={selectedKeys}
          />
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
