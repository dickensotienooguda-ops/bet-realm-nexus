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

  const [homeTeam, setHomeTeam] = useState("Loading...");
  const [awayTeam, setAwayTeam] = useState("");
  const [league, setLeague] = useState("");
  const [homeOdds, setHomeOdds] = useState<number | undefined>();
  const [drawOdds, setDrawOdds] = useState<number | undefined>();
  const [awayOdds, setAwayOdds] = useState<number | undefined>();
  const [homeScore, setHomeScore] = useState<number | null>(null);
  const [awayScore, setAwayScore] = useState<number | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>("upcoming");
  const [loading, setLoading] = useState(true);
  const [homeLogo, setHomeLogo] = useState("");
  const [awayLogo, setAwayLogo] = useState("");
  const [sport, setSport] = useState("soccer");
  const [venue, setVenue] = useState("");
  const [kickOff, setKickOff] = useState("");
  const [marketCount, setMarketCount] = useState(14);

  useEffect(() => {
    fetch(`/api/fixture-details?fixtureId=${encodeURIComponent(matchId)}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.match) {
          const m = result.match;
          setHomeTeam(m.homeTeam);
          setAwayTeam(m.awayTeam);
          setLeague(m.league);
          setHomeLogo(m.homeLogo || "");
          setAwayLogo(m.awayLogo || "");
          setSport(m.sport || "soccer");
          setVenue(m.venue || "");
          setKickOff(m.kickOffDisplay || "");
          setMarketCount(m.markets || 14);
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
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set<string>());

  // Auto-expand first 4 markets once loaded
  useEffect(() => {
    if (!loading && markets.length > 0 && expandedMarkets.size === 0) {
      setExpandedMarkets(new Set(markets.slice(0, 4).map((m) => m.id)));
    }
  }, [loading, markets.length]);

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

  const sportIcon: Record<string, string> = {
    soccer: "⚽",
    basketball: "🏀",
    tennis: "🎾",
    cricket: "🏏",
    rugby: "🏉",
    baseball: "⚾",
  };

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
            <p className="text-xs text-muted-foreground">
              {sportIcon[sport] || "🏅"} {league}
            </p>

            {loading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading match...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 py-1">
                  {homeLogo && (
                    <img src={homeLogo} alt={homeTeam} className="h-6 w-6 rounded-full object-contain" />
                  )}
                  <span className="text-sm font-bold">{homeTeam}</span>
                  {(isLive || matchStatus === "finished") && homeScore !== null && (
                    <span className="text-sm font-bold text-primary">{homeScore}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {awayLogo && (
                    <img src={awayLogo} alt={awayTeam} className="h-6 w-6 rounded-full object-contain" />
                  )}
                  <span className="text-sm font-bold">{awayTeam}</span>
                  {(isLive || matchStatus === "finished") && awayScore !== null && (
                    <span className="text-sm font-bold text-primary">{awayScore}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {isLive && <span className="text-live animate-pulse font-bold">● LIVE</span>}
                  {matchStatus === "finished" && <span>FT</span>}
                  {matchStatus === "upcoming" && kickOff && <span>{kickOff}</span>}
                  {venue && <span>• {venue}</span>}
                </div>
              </>
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
      {!loading && (
        <div className="space-y-2 px-4 pt-3">
          {markets.map((market) => {
            const isExpanded = expandedMarkets.has(market.id);
            const colCount =
              market.outcomes.length === 2
                ? "grid-cols-2"
                : market.outcomes.length === 3
                  ? "grid-cols-3"
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
      )}

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
