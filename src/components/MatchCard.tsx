import { Link } from "@tanstack/react-router";

export interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  leagueLogo?: string;
  kickOff: string;
  kickOffDisplay?: string;
  status: "upcoming" | "live" | "finished";
  homeScore?: number;
  awayScore?: number;
  markets?: number;
  odds?: { home: number; draw: number; away: number };
}

interface MatchCardProps {
  match: MatchData;
  onOddsClick?: (matchId: string, selection: "home" | "draw" | "away", odds: number) => void;
  selectedSelections?: Set<string>;
}

export function MatchCard({ match, onOddsClick, selectedSelections }: MatchCardProps) {
  const isLive = match.status === "live";
  const timeStr = isLive ? "LIVE" : match.kickOffDisplay || match.kickOff;

  const detailLink = `/match/${match.id}?home=${encodeURIComponent(match.homeTeam)}&away=${encodeURIComponent(match.awayTeam)}&league=${encodeURIComponent(match.league)}${match.odds ? `&ho=${match.odds.home}&do=${match.odds.draw}&ao=${match.odds.away}` : ""}`;

  return (
    <div className="rounded-xl bg-card p-3">
      {/* League header */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{match.league}</span>
        <div className="flex items-center gap-1.5">
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />}
          <span className={isLive ? "font-semibold text-live" : ""}>{timeStr}</span>
          {match.markets && (
            <Link to={detailLink as any} className="text-primary hover:underline">
              +{match.markets}
            </Link>
          )}
        </div>
      </div>

      {/* Teams — clickable to detail */}
      <Link to={detailLink as any} className="mb-3 block space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{match.homeTeam}</span>
          {(isLive || match.status === "finished") && (
            <span className="text-sm font-bold">{match.homeScore}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{match.awayTeam}</span>
          {(isLive || match.status === "finished") && (
            <span className="text-sm font-bold">{match.awayScore}</span>
          )}
        </div>
      </Link>

      {/* Odds */}
      {match.odds && (
        <div className="grid grid-cols-3 gap-2">
          {(["home", "draw", "away"] as const).map((sel) => {
            const key = `${match.id}-${sel}`;
            const isSelected = selectedSelections?.has(key);
            return (
              <button
                key={sel}
                onClick={() => onOddsClick?.(match.id, sel, match.odds![sel])}
                className={`odds-btn ${isSelected ? "selected" : ""}`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-muted-foreground">
                    {sel === "home" ? "1" : sel === "draw" ? "X" : "2"}
                  </span>
                  <span>{match.odds![sel].toFixed(2)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
