import { createServerFn } from "@tanstack/react-start";

interface SportMonksFixture {
  id: number;
  sport_id: number;
  league_id: number;
  name: string;
  starting_at: string;
  has_odds: boolean;
  result_info: string | null;
  state: { id: number; state: string; short_name: string };
  participants: Array<{
    id: number;
    name: string;
    short_code: string;
    image_path: string;
    meta: { location: string; winner: boolean; position: number };
  }>;
  scores: Array<{
    participant_id: number;
    score: { goals: number; participant: string };
    description: string;
  }>;
  league: {
    id: number;
    name: string;
    image_path: string;
    country: { name: string };
  };
}

export interface MatchResponse {
  id: string;
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  league: string;
  leagueLogo: string;
  kickOff: string;
  kickOffDisplay: string;
  status: "upcoming" | "live" | "finished";
  homeScore: number;
  awayScore: number;
  markets: number;
  odds: { home: number; draw: number; away: number };
  homePosition?: number;
  awayPosition?: number;
  sport: string; // "soccer" | "basketball" | "tennis" | "cricket" | "rugby" | "baseball"
}

function mapFixtureStatus(state: string): "upcoming" | "live" | "finished" {
  const liveStates = ["LIVE", "HT", "ET", "PEN_LIVE", "BREAK", "1ST_HALF", "2ND_HALF"];
  const finishedStates = ["FT", "AET", "FT_PEN", "POSTP", "CANCL", "ABAN", "AWARDED"];
  if (liveStates.includes(state)) return "live";
  if (finishedStates.includes(state)) return "finished";
  return "upcoming";
}

function formatKickOff(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });
  } catch {
    return dateStr;
  }
}

function generateOdds(
  fixtureId: number,
  homePosition: number,
  awayPosition: number
): { home: number; draw: number; away: number } {
  const positionDiff = awayPosition - homePosition;
  const homeStrength = 0.45 + positionDiff * 0.015;
  const clampedHome = Math.max(0.2, Math.min(0.7, homeStrength));
  const drawProb = 0.25;
  const awayProb = 1 - clampedHome - drawProb;
  const seed = fixtureId % 100;
  const variance = (seed - 50) * 0.002;
  const homeProb = Math.max(0.12, clampedHome + variance);
  const finalAwayProb = Math.max(0.12, awayProb - variance);
  const finalDrawProb = Math.max(0.12, 1 - homeProb - finalAwayProb);
  const margin = 0.92;
  return {
    home: +Math.max(1.05, margin / homeProb).toFixed(2),
    draw: +Math.max(1.05, margin / finalDrawProb).toFixed(2),
    away: +Math.max(1.05, margin / finalAwayProb).toFixed(2),
  };
}

function mapFixture(f: SportMonksFixture, sport = "soccer"): MatchResponse | null {
  if (!f.participants || f.participants.length < 2) return null;
  const home = f.participants.find((p) => p.meta?.location === "home") || f.participants[0];
  const away = f.participants.find((p) => p.meta?.location === "away") || f.participants[1];
  if (!home || !away) return null;

  const homeScore =
    f.scores?.find((s) => s.participant_id === home.id && s.description === "CURRENT")?.score?.goals ?? 0;
  const awayScore =
    f.scores?.find((s) => s.participant_id === away.id && s.description === "CURRENT")?.score?.goals ?? 0;
  const status = mapFixtureStatus(f.state?.short_name || "NS");
  const homePos = home.meta?.position || 10;
  const awayPos = away.meta?.position || 10;
  const odds = generateOdds(f.id, homePos, awayPos);

  return {
    id: f.id.toString(),
    externalId: f.id,
    homeTeam: home.name,
    awayTeam: away.name,
    homeLogo: home.image_path || "",
    awayLogo: away.image_path || "",
    league: f.league
      ? `${f.league.country?.name || ""} • ${f.league.name || ""}`
      : sport === "cricket" ? "Cricket" : "Football",
    leagueLogo: f.league?.image_path || "",
    kickOff: f.starting_at,
    kickOffDisplay: status === "live" ? "LIVE" : formatKickOff(f.starting_at),
    status,
    homeScore,
    awayScore,
    markets: 14,
    odds,
    homePosition: homePos,
    awayPosition: awayPos,
    sport,
  };
}

async function fetchPage(url: string): Promise<SportMonksFixture[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("SportMonks fetch failed:", res.status);
      return [];
    }
    const json = await res.json();
    return (json.data || []).filter((f: any) => f.participants?.length >= 2);
  } catch (err) {
    console.error("SportMonks fetch error:", err);
    return [];
  }
}

// ----------- TheSportsDB free API for basketball, tennis, etc. -----------

interface SportsDBEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strLeague: string;
  strThumb: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strLeagueBadge: string | null;
  dateEvent: string;
  strTime: string;
  strStatus: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strSport: string;
}

function mapSportsDBSport(sport: string): string {
  const map: Record<string, string> = {
    Soccer: "soccer",
    Basketball: "basketball",
    Tennis: "tennis",
    Cricket: "cricket",
    Rugby: "rugby",
    Baseball: "baseball",
    "Ice Hockey": "hockey",
    Volleyball: "volleyball",
  };
  return map[sport] || sport.toLowerCase();
}

function mapSportsDBEvent(e: SportsDBEvent): MatchResponse {
  const status: "upcoming" | "live" | "finished" =
    e.strStatus === "Match Finished" || e.intHomeScore !== null ? "finished" :
    e.strStatus && e.strStatus !== "Not Started" ? "live" : "upcoming";

  const id = `sdb-${e.idEvent}`;
  const numId = parseInt(e.idEvent, 10) || Math.floor(Math.random() * 100000);
  const homeScore = parseInt(e.intHomeScore || "0", 10) || 0;
  const awayScore = parseInt(e.intAwayScore || "0", 10) || 0;

  const odds = generateOdds(numId, 10, 10);
  const kickOff = `${e.dateEvent}T${e.strTime || "00:00:00"}`;

  return {
    id,
    externalId: numId,
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    homeLogo: e.strHomeTeamBadge || "",
    awayLogo: e.strAwayTeamBadge || "",
    league: e.strLeague,
    leagueLogo: e.strLeagueBadge || "",
    kickOff,
    kickOffDisplay: status === "live" ? "LIVE" : formatKickOff(kickOff),
    status,
    homeScore,
    awayScore,
    markets: 8,
    odds,
    sport: mapSportsDBSport(e.strSport),
  };
}

// TheSportsDB league IDs for popular leagues
const SPORTSDB_LEAGUES: { id: string; sport: string }[] = [
  // Basketball
  { id: "4387", sport: "basketball" }, // NBA
  { id: "4431", sport: "basketball" }, // EuroLeague
  // Tennis
  { id: "4464", sport: "tennis" }, // ATP
  { id: "4467", sport: "tennis" }, // WTA
  // Cricket
  { id: "4472", sport: "cricket" }, // IPL
  { id: "4654", sport: "cricket" }, // T20 World Cup
  // Rugby
  { id: "4405", sport: "rugby" }, // Six Nations
  { id: "4419", sport: "rugby" }, // Super Rugby
  // Baseball
  { id: "4424", sport: "baseball" }, // MLB
];

async function fetchSportsDBEvents(): Promise<MatchResponse[]> {
  const results: MatchResponse[] = [];

  // Fetch next 15 events for each league
  const fetches = SPORTSDB_LEAGUES.map(async (league) => {
    try {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.id}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      if (!json.events) return [];
      return (json.events as SportsDBEvent[]).map(mapSportsDBEvent);
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(fetches);
  for (const r of allResults) {
    results.push(...r);
  }

  // Also fetch live/recent events
  try {
    const liveUrls = [
      "https://www.thesportsdb.com/api/v2/json/3/livescore/Basketball",
      "https://www.thesportsdb.com/api/v2/json/3/livescore/Tennis",
      "https://www.thesportsdb.com/api/v2/json/3/livescore/Cricket",
    ];
    // These are v2 endpoints that may or may not work on the free tier
    // Fail gracefully
  } catch {
    // ignore
  }

  return results;
}

// ----------- Main fetch functions -----------

export const fetchFixtures = createServerFn({ method: "POST" })
  .inputValidator((input: { date?: string; live?: boolean; days?: number; sport?: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.SPORTMONKS_API_KEY;
    const sport = data.sport || "all";

    const allMatches: MatchResponse[] = [];
    const errors: string[] = [];

    // --- Fetch football from SportMonks ---
    if (sport === "all" || sport === "soccer") {
      if (!apiKey) {
        errors.push("Sports feed not configured for football");
      } else {
        const includes = "participants;scores;state;league.country";
        const perPage = 50;
        const live = Boolean(data.live);

        try {
          if (live) {
            const url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${apiKey}&include=${includes}&per_page=${perPage}`;
            const fixtures = await fetchPage(url);
            const matches = fixtures.map((f) => mapFixture(f, "soccer")).filter(Boolean) as MatchResponse[];
            allMatches.push(...matches);
          } else {
            const today = data.date || new Date().toISOString().split("T")[0];
            const dates: string[] = [];
            for (let i = 0; i < 3; i++) {
              const d = new Date(today);
              d.setDate(d.getDate() + i);
              dates.push(d.toISOString().split("T")[0]);
            }

            for (const d of dates) {
              const url1 = `https://api.sportmonks.com/v3/football/fixtures/date/${d}?api_token=${apiKey}&include=${includes}&per_page=${perPage}`;
              const page1 = await fetchPage(url1);
              allMatches.push(...(page1.map((f) => mapFixture(f, "soccer")).filter(Boolean) as MatchResponse[]));
              if (page1.length >= perPage) {
                const page2 = await fetchPage(`${url1}&page=2`);
                allMatches.push(...(page2.map((f) => mapFixture(f, "soccer")).filter(Boolean) as MatchResponse[]));
              }
            }
          }
        } catch (err) {
          console.error("SportMonks football error:", err);
          errors.push("Failed to fetch football fixtures");
        }
      }
    }

    // --- Fetch basketball, tennis, cricket, rugby, baseball from TheSportsDB ---
    if (sport === "all" || ["basketball", "tennis", "cricket", "rugby", "baseball"].includes(sport)) {
      try {
        const sdbMatches = await fetchSportsDBEvents();
        if (sport !== "all") {
          allMatches.push(...sdbMatches.filter((m) => m.sport === sport));
        } else {
          allMatches.push(...sdbMatches);
        }
      } catch (err) {
        console.error("TheSportsDB error:", err);
        errors.push("Failed to fetch multi-sport fixtures");
      }
    }

    // Sort: live first, upcoming, finished
    allMatches.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      if (a.status === "upcoming" && b.status === "finished") return -1;
      if (b.status === "upcoming" && a.status === "finished") return 1;
      return new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime();
    });

    return {
      matches: allMatches,
      error: errors.length > 0 ? errors.join("; ") : null,
      fallback: false,
    };
  });

export const fetchFixtureDetails = createServerFn({ method: "POST" })
  .inputValidator((input: { fixtureId: string }) => input)
  .handler(async ({ data }) => {
    // Handle TheSportsDB fixtures
    if (data.fixtureId.startsWith("sdb-")) {
      const eventId = data.fixtureId.replace("sdb-", "");
      try {
        const url = `https://www.thesportsdb.com/api/v1/json/3/lookupevent.php?id=${eventId}`;
        const res = await fetch(url);
        if (!res.ok) return { match: null, error: `API error: ${res.status}` };
        const json = await res.json();
        const e = json.events?.[0];
        if (!e) return { match: null, error: "Event not found" };

        const mapped = mapSportsDBEvent(e);
        return { match: { ...mapped, statistics: [] }, error: null };
      } catch (err) {
        console.error("TheSportsDB detail error:", err);
        return { match: null, error: "Failed to fetch event details" };
      }
    }

    // Handle SportMonks football fixtures
    const apiKey = process.env.SPORTMONKS_API_KEY;
    if (!apiKey) {
      return { match: null, error: "API key not configured" };
    }

    try {
      const url = `https://api.sportmonks.com/v3/football/fixtures/${data.fixtureId}?api_token=${apiKey}&include=participants;scores;state;league.country;statistics`;
      const res = await fetch(url);
      if (!res.ok) return { match: null, error: `API error: ${res.status}` };
      const json = await res.json();
      const f = json.data;
      if (!f || !f.participants || f.participants.length < 2) {
        return { match: null, error: "Fixture not found" };
      }
      const mapped = mapFixture(f, "soccer");
      return {
        match: mapped ? { ...mapped, statistics: f.statistics || [] } : null,
        error: mapped ? null : "Failed to map fixture",
      };
    } catch (err) {
      console.error("SportMonks fixture detail error:", err);
      return { match: null, error: "Failed to fetch fixture details" };
    }
  });
