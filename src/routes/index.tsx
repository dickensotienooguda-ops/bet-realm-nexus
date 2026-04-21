import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MatchCard, type MatchData } from "@/components/MatchCard";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";
import { Loader2, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchFixtures } from "@/lib/sportmonks.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BetPro — Sports Betting Platform" },
      { name: "description", content: "Browse matches, place bets, and win big on football, basketball, tennis and more" },
    ],
  }),
  component: HomePage,
});

const sportsTabs = [
  { id: "all", label: "🔥 All" },
  { id: "soccer", label: "⚽ Football" },
  { id: "basketball", label: "🏀 Basketball" },
  { id: "tennis", label: "🎾 Tennis" },
  { id: "cricket", label: "🏏 Cricket" },
  { id: "rugby", label: "🏉 Rugby" },
  { id: "baseball", label: "⚾ Baseball" },
  { id: "esports", label: "🎮 Esports" },
];



const featuredLeagues = [
  "Premier League", "La Liga", "Serie A", "Bundesliga",
  "Champions League", "Africa Cup", "World Cup Qualifiers",
];

function HomePage() {
  const betSlip = useBetSlip();
  const [activeSport, setActiveSport] = useState("all");
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  useEffect(() => {
    setLoading(true);
    fetchFixtures({ data: {} })
      .then((result) => {
        if (result.error) setError(result.error);
        if (result.matches.length > 0) setMatches(result.matches as MatchData[]);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load matches");
        setLoading(false);
      });
  }, []);

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

  // Group matches by league
  const matchesByLeague = matches.reduce<Record<string, MatchData[]>>((acc, m) => {
    const league = m.league || "Other";
    if (!acc[league]) acc[league] = [];
    acc[league].push(m);
    return acc;
  }, {});

  const leagues = Object.keys(matchesByLeague);

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />





      {/* Sport filter tabs */}
      <CategoryTabs tabs={sportsTabs} activeTab={activeSport} onTabChange={setActiveSport} />

      {/* Featured leagues row */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {featuredLeagues.map((league) => (
          <span
            key={league}
            className="shrink-0 rounded-lg bg-surface-elevated px-3 py-1.5 text-[10px] font-medium text-muted-foreground"
          >
            {league}
          </span>
        ))}
      </div>

      {/* Matches by league */}
      <div className="space-y-4 px-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="rounded-xl bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error || "No games available right now"}</p>
            <p className="mt-1 text-xs text-muted-foreground">We&apos;re updating the fixture feed.</p>
          </div>
        )}

        {leagues.map((league) => (
          <div key={league}>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-xs font-semibold">{league}</h3>
                <span className="text-[10px] text-muted-foreground">
                  {matchesByLeague[league].length} matches
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>1</span>
                <span className="mx-1">X</span>
                <span>2</span>
              </div>
            </div>
            <div className="space-y-2">
              {matchesByLeague[league].map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onOddsClick={handleOddsClick}
                  selectedSelections={selectedKeys}
                />
              ))}
            </div>
          </div>
        ))}

        {!loading && matches.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <Link
              to="/live"
              className="flex items-center gap-1 rounded-xl bg-card px-4 py-2.5 text-xs font-medium text-primary"
            >
              View Live Matches <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Floating bet counter */}
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
