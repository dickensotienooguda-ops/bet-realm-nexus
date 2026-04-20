import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { addSelection, useBetSlip, getSelectionKey } from "@/lib/betslip-store";
import { CategoryTabs } from "@/components/CategoryTabs";
import { Timer, Trophy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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
  { id: "football", label: "⚽ Football" },
  { id: "basketball", label: "🏀 Basketball" },
  { id: "tennis", label: "🎾 Tennis" },
  { id: "racing", label: "🏇 Horse Racing" },
  { id: "dogs", label: "🐕 Greyhounds" },
  { id: "motor", label: "🏎️ Motor Racing" },
];

interface VirtualMarket {
  id: string;
  label: string;
  outcomes: { key: string; label: string; odds: number }[];
}

interface VirtualMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  odds: { home: number; draw: number; away: number };
  status: "betting" | "playing" | "finished";
  homeScore?: number;
  awayScore?: number;
  markets: VirtualMarket[];
}

// Realistic team/league data per sport
const sportData: Record<string, { leagues: string[]; teams: string[][] }> = {
  football: {
    leagues: ["Virtual Premier League", "Virtual Champions Cup", "Virtual Serie A", "Virtual Bundesliga"],
    teams: [
      ["Manchester Reds", "London Blues", "Liverpool Reds", "North London Whites"],
      ["Arsenal Gunners", "Everton Toffees", "Wolves FC", "Brighton Seagulls"],
      ["AC Roma", "Inter Stars", "Napoli FC", "Juventus FC"],
      ["Bayern FC", "Dortmund BVB", "Leipzig Bulls", "Leverkusen Works"],
    ],
  },
  basketball: {
    leagues: ["Virtual NBA", "Virtual EuroLeague", "Virtual AfroLeague"],
    teams: [
      ["LA Lakers", "Chicago Bulls", "Boston Celtics", "Brooklyn Nets"],
      ["Miami Heat", "Golden State", "Phoenix Suns", "Denver Nuggets"],
      ["Barcelona BC", "Real Madrid BC", "CSKA Moscow", "Fenerbahce BC"],
    ],
  },
  tennis: {
    leagues: ["Virtual Grand Slam", "Virtual ATP Masters", "Virtual WTA Open"],
    teams: [
      ["N. Djokovic", "C. Alcaraz", "J. Sinner", "D. Medvedev"],
      ["A. Rublev", "S. Tsitsipas", "H. Rune", "A. de Minaur"],
      ["I. Swiatek", "A. Sabalenka", "C. Gauff", "E. Rybakina"],
    ],
  },
  racing: {
    leagues: ["Virtual Royal Ascot", "Virtual Kentucky Derby", "Virtual Melbourne Cup"],
    teams: [
      ["Thunderbolt", "Golden Arrow", "Dark Shadow", "Silver Streak"],
      ["Red Flame", "Lightning Strike", "Iron Horse", "Royal Crown"],
      ["Speed Demon", "Star Runner", "Night Fury", "Victory Lane"],
    ],
  },
  dogs: {
    leagues: ["Virtual Greyhound Cup", "Virtual Sprint Series", "Virtual Derby"],
    teams: [
      ["Trap 1 - Lucky Star", "Trap 2 - Fast Track", "Trap 3 - Gold Rush", "Trap 4 - Hot Shot"],
      ["Trap 5 - Wild Card", "Trap 6 - Top Dog", "Trap 1 - Swift Paw", "Trap 2 - Ace High"],
      ["Trap 3 - Sure Bet", "Trap 4 - Dark Horse", "Trap 5 - Big Win", "Trap 6 - Front Runner"],
    ],
  },
  motor: {
    leagues: ["Virtual F1 Grand Prix", "Virtual Rally Championship", "Virtual MotoGP"],
    teams: [
      ["Red Bull Racing", "Mercedes AMG", "Ferrari F1", "McLaren Racing"],
      ["Alpine F1", "Aston Martin", "Williams Racing", "AlphaTauri"],
      ["Ducati MotoGP", "Yamaha Racing", "Honda Repsol", "Aprilia Racing"],
    ],
  },
};

function sRnd(seed: string, idx: number, min: number, max: number): number {
  let hash = 0;
  const str = seed + idx.toString();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return +(min + (Math.abs(hash) % 10000) / 10000 * (max - min)).toFixed(2);
}

function generateVirtualMarkets(matchId: string, sport: string, h: number, d: number, a: number): VirtualMarket[] {
  const markets: VirtualMarket[] = [];
  const noDrawSports = ["tennis", "racing", "dogs", "motor"];
  const hasDraw = !noDrawSports.includes(sport);

  // 1X2 / Winner
  if (hasDraw) {
    markets.push({
      id: `${matchId}-1x2`,
      label: "Match Result",
      outcomes: [
        { key: "home", label: "1", odds: h },
        { key: "draw", label: "X", odds: d },
        { key: "away", label: "2", odds: a },
      ],
    });
  } else {
    markets.push({
      id: `${matchId}-winner`,
      label: "Winner",
      outcomes: [
        { key: "home", label: "Player 1", odds: h },
        { key: "away", label: "Player 2", odds: a },
      ],
    });
  }

  if (sport === "football" || sport === "basketball") {
    // Double Chance
    if (hasDraw) {
      markets.push({
        id: `${matchId}-dc`,
        label: "Double Chance",
        outcomes: [
          { key: "1x", label: "1 or X", odds: +Math.max(1.05, 1 / (1/h + 1/d)).toFixed(2) },
          { key: "12", label: "1 or 2", odds: +Math.max(1.05, 1 / (1/h + 1/a)).toFixed(2) },
          { key: "x2", label: "X or 2", odds: +Math.max(1.05, 1 / (1/d + 1/a)).toFixed(2) },
        ],
      });
    }

    // Over/Under
    const ou = sport === "basketball" ? [
      { line: "180.5", overOdds: sRnd(matchId, 10, 1.7, 2.1), underOdds: sRnd(matchId, 11, 1.7, 2.1) },
      { line: "200.5", overOdds: sRnd(matchId, 12, 1.8, 2.3), underOdds: sRnd(matchId, 13, 1.6, 2.0) },
    ] : [
      { line: "1.5", overOdds: sRnd(matchId, 10, 1.2, 1.6), underOdds: sRnd(matchId, 11, 2.2, 4.0) },
      { line: "2.5", overOdds: sRnd(matchId, 12, 1.7, 2.4), underOdds: sRnd(matchId, 13, 1.5, 2.2) },
      { line: "3.5", overOdds: sRnd(matchId, 14, 2.2, 3.8), underOdds: sRnd(matchId, 15, 1.2, 1.6) },
    ];
    ou.forEach((o, i) => {
      markets.push({
        id: `${matchId}-ou${i}`,
        label: `Over/Under ${o.line}`,
        outcomes: [
          { key: `over_${o.line}`, label: `Over ${o.line}`, odds: o.overOdds },
          { key: `under_${o.line}`, label: `Under ${o.line}`, odds: o.underOdds },
        ],
      });
    });

    // BTTS (football only)
    if (sport === "football") {
      markets.push({
        id: `${matchId}-btts`,
        label: "Both Teams to Score",
        outcomes: [
          { key: "yes", label: "Yes", odds: sRnd(matchId, 20, 1.5, 2.2) },
          { key: "no", label: "No", odds: sRnd(matchId, 21, 1.5, 2.3) },
        ],
      });

      // Correct Score
      const scores = ["1-0", "0-1", "2-1", "1-2", "2-0", "0-2", "1-1", "0-0", "2-2", "3-0", "3-1", "3-2"];
      markets.push({
        id: `${matchId}-cs`,
        label: "Correct Score",
        outcomes: scores.map((s, idx) => ({
          key: s,
          label: s,
          odds: sRnd(matchId, 30 + idx, 5.0, 35.0),
        })),
      });

      // Half Time Result
      markets.push({
        id: `${matchId}-ht`,
        label: "Half-Time Result",
        outcomes: [
          { key: "ht_home", label: "Home", odds: sRnd(matchId, 50, 2.2, 5.0) },
          { key: "ht_draw", label: "Draw", odds: sRnd(matchId, 51, 1.8, 2.8) },
          { key: "ht_away", label: "Away", odds: sRnd(matchId, 52, 2.5, 6.0) },
        ],
      });
    }
  }

  if (sport === "tennis") {
    // Set Winner
    markets.push({
      id: `${matchId}-set1`,
      label: "1st Set Winner",
      outcomes: [
        { key: "set1_home", label: "Player 1", odds: sRnd(matchId, 60, 1.5, 2.8) },
        { key: "set1_away", label: "Player 2", odds: sRnd(matchId, 61, 1.5, 2.8) },
      ],
    });
    // Total Sets
    markets.push({
      id: `${matchId}-sets`,
      label: "Total Sets",
      outcomes: [
        { key: "2sets", label: "2 Sets", odds: sRnd(matchId, 62, 1.6, 2.5) },
        { key: "3sets", label: "3 Sets", odds: sRnd(matchId, 63, 1.6, 2.5) },
      ],
    });
  }

  if (sport === "racing" || sport === "dogs" || sport === "motor") {
    // Place (Top 2)
    markets.push({
      id: `${matchId}-place`,
      label: "Top 2 Finish",
      outcomes: [
        { key: "place_home", label: "Runner 1", odds: sRnd(matchId, 70, 1.2, 1.8) },
        { key: "place_away", label: "Runner 2", odds: sRnd(matchId, 71, 1.2, 1.8) },
      ],
    });
    // Margin
    markets.push({
      id: `${matchId}-margin`,
      label: "Winning Margin",
      outcomes: [
        { key: "close", label: "Close (<1 length)", odds: sRnd(matchId, 72, 2.0, 3.5) },
        { key: "clear", label: "Clear (1-3)", odds: sRnd(matchId, 73, 1.8, 2.5) },
        { key: "dominant", label: "Dominant (3+)", odds: sRnd(matchId, 74, 3.0, 6.0) },
      ],
    });
  }

  return markets;
}

function generateMatches(sport: string, roundId: number): VirtualMatch[] {
  const data = sportData[sport] || sportData.football;
  const leagueIdx = roundId % data.leagues.length;
  const league = data.leagues[leagueIdx];
  const teamPool = data.teams[leagueIdx % data.teams.length];
  const shuffled = [...teamPool].sort(() => Math.random() - 0.5);
  const matches: VirtualMatch[] = [];
  const numMatches = Math.floor(shuffled.length / 2);
  const noDrawSports = ["tennis", "racing", "dogs", "motor"];

  for (let i = 0; i < numMatches; i++) {
    const id = `virt-${sport}-${roundId}-${i}`;
    const h = +(1.5 + Math.random() * 3).toFixed(2);
    const d = noDrawSports.includes(sport) ? 0 : +(2.5 + Math.random() * 2).toFixed(2);
    const a = +(1.5 + Math.random() * 4).toFixed(2);

    matches.push({
      id,
      homeTeam: shuffled[i * 2],
      awayTeam: shuffled[i * 2 + 1],
      league: `${league} • Round ${roundId}`,
      odds: { home: h, draw: d, away: a },
      status: "betting",
      markets: generateVirtualMarkets(id, sport, h, d, a),
    });
  }
  return matches;
}

function simulateResult(match: VirtualMatch, sport: string): VirtualMatch {
  let homeScore: number;
  let awayScore: number;

  switch (sport) {
    case "basketball":
      homeScore = 75 + Math.floor(Math.random() * 50);
      awayScore = 75 + Math.floor(Math.random() * 50);
      break;
    case "tennis":
      homeScore = Math.random() > 0.5 ? 2 : Math.floor(Math.random() * 2);
      awayScore = homeScore === 2 ? Math.floor(Math.random() * 2) : 2;
      break;
    case "racing":
    case "dogs":
    case "motor":
      // Position-based: lower = better
      homeScore = Math.floor(Math.random() * 4) + 1;
      awayScore = homeScore === 1 ? Math.floor(Math.random() * 3) + 2 : Math.floor(Math.random() * 4) + 1;
      break;
    default: // football
      homeScore = Math.floor(Math.random() * 5);
      awayScore = Math.floor(Math.random() * 5);
  }

  return { ...match, status: "finished", homeScore, awayScore };
}

function VirtualPage() {
  const [sport, setSport] = useState("football");
  const [round, setRound] = useState(1);
  const [matches, setMatches] = useState<VirtualMatch[]>([]);
  const [countdown, setCountdown] = useState(60);
  const [phase, setPhase] = useState<"betting" | "playing" | "results">("betting");
  const [expandedMarkets, setExpandedMarkets] = useState<Set<string>>(new Set());
  const betSlip = useBetSlip();

  const selectedKeys = new Set(
    betSlip.selections.map((s) => getSelectionKey(s.matchId, s.selectionType))
  );

  const startNewRound = useCallback(() => {
    const newRound = round + 1;
    setRound(newRound);
    setMatches(generateMatches(sport, newRound));
    setCountdown(60);
    setPhase("betting");
    setExpandedMarkets(new Set());
  }, [sport, round]);

  useEffect(() => {
    setRound(1);
    setMatches(generateMatches(sport, 1));
    setCountdown(60);
    setPhase("betting");
    setExpandedMarkets(new Set());
  }, [sport]);

  useEffect(() => {
    if (phase !== "betting") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setPhase("playing");
          setTimeout(() => {
            setMatches((prev) => prev.map((m) => simulateResult(m, sport)));
            setPhase("results");
          }, 3000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, sport]);

  const handleOddsClick = (matchId: string, outcomeKey: string, odds: number, label: string, marketLabel: string) => {
    if (phase !== "betting") return;
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    addSelection({
      matchId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      league: match.league,
      selectionType: outcomeKey as any,
      selectionLabel: `${marketLabel}: ${label}`,
      odds,
    });
  };

  const toggleMarketExpand = (marketId: string) => {
    setExpandedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(marketId)) next.delete(marketId);
      else next.add(marketId);
      return next;
    });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const getScoreLabel = () => {
    if (sport === "racing" || sport === "dogs" || sport === "motor") return "Position";
    if (sport === "tennis") return "Sets";
    return "Score";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar />

      {/* Hero banner */}
      <div className="mx-4 mt-3 rounded-xl bg-gradient-to-br from-[oklch(0.45_0.2_280)] to-[oklch(0.35_0.15_310)] p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="mb-1 inline-block rounded bg-foreground/20 px-2 py-0.5 text-[10px] font-bold uppercase text-foreground">
              Virtual Games
            </span>
            <h2 className="text-lg font-bold text-foreground">Instant Results</h2>
            <p className="text-xs text-foreground/70">New round every 60 seconds • {virtualTabs.length} sports</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/20 backdrop-blur-sm">
              <Timer className="h-5 w-5 text-foreground" />
            </div>
            <span className="mt-1 text-sm font-bold tabular-nums text-foreground">
              {phase === "betting" ? formatTime(countdown) : phase === "playing" ? "LIVE" : "FT"}
            </span>
          </div>
        </div>
      </div>

      {/* Sport tabs */}
      <div className="mt-3 overflow-x-auto">
        <CategoryTabs tabs={virtualTabs} activeTab={sport} onTabChange={setSport} />
      </div>

      {/* Round info */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Round {round}</span>
          <span className="text-[10px] text-muted-foreground">• {matches.length} matches</span>
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
              className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground"
            >
              <RefreshCw className="h-3 w-3" /> Next Round
            </button>
          )}
        </div>
      </div>

      {/* Matches */}
      <div className="space-y-2 px-4">
        {matches.map((match) => (
          <div key={match.id} className="rounded-xl bg-card overflow-hidden">
            {/* Match header */}
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{match.league}</span>
                {phase === "betting" && (
                  <span className="tabular-nums text-primary font-medium">{formatTime(countdown)}</span>
                )}
                {phase === "playing" && <span className="text-live font-bold animate-pulse">LIVE</span>}
                {phase === "results" && <span className="text-muted-foreground">FT</span>}
              </div>

              <div className="mb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{match.homeTeam}</span>
                  {phase !== "betting" && (
                    <span className="text-sm font-bold">{match.homeScore ?? 0}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{match.awayTeam}</span>
                  {phase !== "betting" && (
                    <span className="text-sm font-bold">{match.awayScore ?? 0}</span>
                  )}
                </div>
              </div>

              {/* Primary market (1X2/Winner) — always visible */}
              {match.markets[0] && (
                <div className={`grid gap-2 ${match.markets[0].outcomes.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                  {match.markets[0].outcomes.map((o) => {
                    const key = getSelectionKey(match.id, o.key);
                    const isSelected = selectedKeys.has(key);
                    let resultClass = "";
                    if (phase === "results" && match.homeScore !== undefined && match.awayScore !== undefined) {
                      const winner = match.homeScore > match.awayScore ? "home" : match.awayScore > match.homeScore ? "away" : "draw";
                      if (o.key === winner) resultClass = "border-won text-won";
                    }
                    return (
                      <button
                        key={o.key}
                        onClick={() => handleOddsClick(match.id, o.key, o.odds, o.label, match.markets[0].label)}
                        disabled={phase !== "betting"}
                        className={`odds-btn ${isSelected ? "selected" : ""} ${resultClass} disabled:opacity-50`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-muted-foreground">{o.label}</span>
                          <span className="text-xs font-bold">{o.odds.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Extra markets toggle */}
            {match.markets.length > 1 && (
              <>
                <button
                  onClick={() => toggleMarketExpand(match.id)}
                  className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-[10px] font-medium text-primary"
                >
                  {expandedMarkets.has(match.id) ? (
                    <>Hide Markets <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>+{match.markets.length - 1} Markets <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>

                {expandedMarkets.has(match.id) && (
                  <div className="space-y-2 px-3 pb-3">
                    {match.markets.slice(1).map((market) => (
                      <div key={market.id}>
                        <p className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase">{market.label}</p>
                        <div className={`grid gap-1.5 ${market.outcomes.length <= 3 ? `grid-cols-${market.outcomes.length}` : "grid-cols-3"}`}>
                          {market.outcomes.map((o) => {
                            const key = getSelectionKey(match.id, o.key);
                            const isSelected = selectedKeys.has(key);
                            return (
                              <button
                                key={o.key}
                                onClick={() => handleOddsClick(match.id, o.key, o.odds, o.label, market.label)}
                                disabled={phase !== "betting"}
                                className={`odds-btn text-[10px] ${isSelected ? "selected" : ""} disabled:opacity-50`}
                              >
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] text-muted-foreground truncate max-w-full">{o.label}</span>
                                  <span className="font-bold">{o.odds.toFixed(2)}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
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
