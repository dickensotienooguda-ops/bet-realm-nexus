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
  sport?: string;
}

interface MatchCardProps {
  match: MatchData;
  onOddsClick?: (matchId: string, selection: "home" | "draw" | "away", odds: number) => void;
  selectedSelections?: Set<string>;
}

export function MatchCard({ match, onOddsClick, selectedSelections }: MatchCardProps) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const timeStr = isLive ? "LIVE" : match.kickOffDisplay || match.kickOff;
  const sportIcon: Record<string, string> = { soccer: "⚽", basketball: "🏀", tennis: "🎾", cricket: "🏏", rugby: "🏉", baseball: "⚾" };
  const icon = match.sport ? sportIcon[match.sport] || "🏅" : "";

  return (
    <div className="rounded-xl bg-card p-3">
      {/* League header */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="text-xs">{icon}</span>}
          {match.leagueLogo && (
            <img src={match.leagueLogo} alt="" className="h-3.5 w-3.5 rounded-sm object-contain" />
          )}
          <span className="truncate">{match.league}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />}
          <span className={isLive ? "font-semibold text-live" : isFinished ? "text-muted-foreground" : ""}>
            {isFinished ? "FT" : timeStr}
          </span>
          {match.markets && (
            <Link to="/match/$matchId" params={{ matchId: match.id }} className="text-primary hover:underline">
              +{match.markets}
            </Link>
          )}
        </div>
      </div>

      {/* Teams — clickable to detail */}
      <Link to="/match/$matchId" params={{ matchId: match.id }} className="mb-3 block space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {match.homeLogo && (
              <img src={match.homeLogo} alt="" className="h-4 w-4 rounded-sm object-contain" />
            )}
            <span className="text-sm font-medium">{match.homeTeam}</span>
          </div>
          {(isLive || isFinished) && (
            <span className={`text-sm font-bold ${isLive ? "text-live" : ""}`}>{match.homeScore}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {match.awayLogo && (
              <img src={match.awayLogo} alt="" className="h-4 w-4 rounded-sm object-contain" />
            )}
            <span className="text-sm font-medium">{match.awayTeam}</span>
          </div>
          {(isLive || isFinished) && (
            <span className={`text-sm font-bold ${isLive ? "text-live" : ""}`}>{match.awayScore}</span>
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
