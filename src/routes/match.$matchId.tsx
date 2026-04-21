import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";
import { generateMarkets, type Market } from "@/lib/markets";
import { fetchFixtureDetails } from "@/lib/sportmonks.functions";
import { ArrowLeft, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/match/$matchId")({
  head: () => ({
    meta: [
      { title: "Match Details — BetPro" },
      { name: "description", content: "View all markets for this match" },
    ],
  }),
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const betSlip = useBetSlip();

  // Parse query params for initial display
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const initialHome = searchParams.get("home") || "Home Team";
  const initialAway = searchParams.get("away") || "Away Team";
  const initialLeague = searchParams.get("league") || "League";
  const ho = parseFloat(searchParams.get("ho") || "0") || undefined;
  const dro = parseFloat(searchParams.get("do") || "0") || undefined;
  const ao = parseFloat(searchParams.get("ao") || "0") || undefined;

  const [homeTeam, setHomeTeam] = useState(initialHome);
  const [awayTeam, setAwayTeam] = useState(initialAway);
  const [league, setLeague] = useState(initialLeague);
  const [homeOdds, setHomeOdds] = useState(ho);
  const [drawOdds, setDrawOdds] = useState(dro);
  const [awayOdds, setAwayOdds] = useState(ao);
  const [homeScore, setHomeScore] = useState<number | null>(null);
  const [awayScore, setAwayScore] = useState<number | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>("upcoming");
  const [loading, setLoading] = useState(true);

  // Fetch real fixture data from API
  useEffect(() => {
    fetchFixtureDetails({ data: { fixtureId: matchId } })
      .then((result) => {
        if (result.match) {
          const m = result.match;
          setHomeTeam(m.homeTeam);
          setAwayTeam(m.awayTeam);
          setLeague(m.league);
          if (m.odds) {
            setHomeOdds(m.odds.home);
            setDrawOdds(m.odds.draw);
            setAwayOdds(m.odds.away);
          }
          setHomeScore(m.homeScore);
          setAwayScore(m.awayScore);
          setMatchStatus(m.status);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [matchId]);

  const markets = generateMarkets(matchId, homeOdds, drawOdds, awayOdds);
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(
    new Set(markets.slice(0, 4).map((m) => m.id))
  );

  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  const toggleMarket = (id: string) => {
    setExpandedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOddsClick = (market: Market, outcomeKey: string, odds: number, label: string) => {
    addSelection({
      matchId,
      marketId: market.id,
      homeTeam,
      awayTeam,
      league,
      selectionType: outcomeKey as any,
      selectionLabel: `${market.label}: ${label}`,
      odds,
    });
  };

  const isLive = matchStatus === "live";

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      {/* Match header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/" })} className="rounded-lg bg-surface-elevated p-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{league}</p>
            <p className="text-sm font-bold">{homeTeam} vs {awayTeam}</p>
            {(isLive || matchStatus === "finished") && homeScore !== null && (
              <p className="text-xs font-bold text-primary">
                {homeScore} - {awayScore}
                {isLive && <span className="ml-2 text-live animate-pulse">● LIVE</span>}
                {matchStatus === "finished" && <span className="ml-2 text-muted-foreground">FT</span>}
              </p>
            )}
          </div>
          <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
            {markets.length} markets
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Markets list */}
      <div className="space-y-2 px-4 pt-3">
        {markets.map((market) => {
          const isExpanded = expandedMarkets.has(market.id);
          const colCount = market.outcomes.length === 2 ? "grid-cols-2"
            : market.outcomes.length === 3 ? "grid-cols-3"
            : "grid-cols-3";

          return (
            <div key={market.id} className="rounded-xl bg-card overflow-hidden">
              <button
                onClick={() => toggleMarket(market.id)}
                className="flex w-full items-center justify-between px-3 py-2.5"
              >
                <span className="text-xs font-semibold">{market.label}</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {isExpanded && (
                <div className={`grid gap-1.5 px-3 pb-3 ${colCount}`}>
                  {market.outcomes.map((outcome) => {
                    const selKey = getSelectionKey(matchId, outcome.key);
                    const isSelected = selectedKeys.has(selKey);
                    return (
                      <button
                        key={outcome.key}
                        onClick={() => handleOddsClick(market, outcome.key, outcome.odds, outcome.label)}
                        className={`odds-btn ${isSelected ? "selected" : ""}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {outcome.label}
                          </span>
                          <span className="text-xs font-bold">{outcome.odds.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating betslip bar */}
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
