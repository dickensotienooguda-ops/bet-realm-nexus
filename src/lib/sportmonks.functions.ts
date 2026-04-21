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

interface MatchResponse {
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

/**
 * Generate realistic odds based on team positions and league context.
 * Uses a seeded deterministic approach based on fixture ID so odds stay stable.
 */
function generateOdds(
  fixtureId: number,
  homePosition: number,
  awayPosition: number
): { home: number; draw: number; away: number } {
  // Home advantage baseline
  const positionDiff = awayPosition - homePosition; // positive = home is better
  const homeStrength = 0.45 + positionDiff * 0.015; // base 45% + position advantage
  const clampedHome = Math.max(0.2, Math.min(0.7, homeStrength));
  const drawProb = 0.25;
  const awayProb = 1 - clampedHome - drawProb;

  // Add small deterministic variance based on fixture ID
  const seed = fixtureId % 100;
  const variance = (seed - 50) * 0.002;

  const homeProb = Math.max(0.12, clampedHome + variance);
  const finalAwayProb = Math.max(0.12, awayProb - variance);
  const finalDrawProb = Math.max(0.12, 1 - homeProb - finalAwayProb);

  // Convert probabilities to odds (with ~8% margin)
  const margin = 0.92;
  return {
    home: +Math.max(1.05, (margin / homeProb)).toFixed(2),
    draw: +Math.max(1.05, (margin / finalDrawProb)).toFixed(2),
    away: +Math.max(1.05, (margin / finalAwayProb)).toFixed(2),
  };
}

function mapFixture(f: SportMonksFixture): MatchResponse | null {
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
      : "Football",
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
  };
}

async function fetchPage(url: string): Promise<SportMonksFixture[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("SportMonks fetch failed:", url.split("api_token")[0], res.status);
      return [];
    }
    const json = await res.json();
    return (json.data || []).filter((f: any) => f.participants?.length >= 2);
  } catch (err) {
    console.error("SportMonks fetch error:", err);
    return [];
  }
}

export const fetchFixtures = createServerFn({ method: "POST" })
  .inputValidator((input: { date?: string; live?: boolean; days?: number }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.SPORTMONKS_API_KEY;
    if (!apiKey) {
      console.error("SPORTMONKS_API_KEY not set");
      return { matches: [], error: "Sports feed not configured", fallback: false };
    }

    const includes = "participants;scores;state;league.country";
    const perPage = 50;
    const live = Boolean(data.live);

    try {
      if (live) {
        const url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${apiKey}&include=${includes}&per_page=${perPage}`;
        const fixtures = await fetchPage(url);
        const matches = fixtures.map(mapFixture).filter(Boolean) as MatchResponse[];
        return { matches, error: null, fallback: false };
      }

      // Fetch today + next 2 days for maximum coverage
      const today = data.date || new Date().toISOString().split("T")[0];
      const dates: string[] = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(d.toISOString().split("T")[0]);
      }

      const allFixtures: SportMonksFixture[] = [];
      for (const d of dates) {
        // Page 1
        const url1 = `https://api.sportmonks.com/v3/football/fixtures/date/${d}?api_token=${apiKey}&include=${includes}&per_page=${perPage}`;
        const page1 = await fetchPage(url1);
        allFixtures.push(...page1);

        // Page 2 if first page was full
        if (page1.length >= perPage) {
          const url2 = `${url1}&page=2`;
          const page2 = await fetchPage(url2);
          allFixtures.push(...page2);
        }
      }

      const matches = allFixtures.map(mapFixture).filter(Boolean) as MatchResponse[];

      // Sort: live first, then by kick-off time
      matches.sort((a, b) => {
        if (a.status === "live" && b.status !== "live") return -1;
        if (b.status === "live" && a.status !== "live") return 1;
        if (a.status === "upcoming" && b.status === "finished") return -1;
        if (b.status === "upcoming" && a.status === "finished") return 1;
        return new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime();
      });

      return { matches, error: null, fallback: false };
    } catch (err) {
      console.error("SportMonks fetch error:", err);
      return { matches: [], error: "Failed to fetch fixtures", fallback: false };
    }
  });

export const fetchFixtureDetails = createServerFn({ method: "POST" })
  .inputValidator((input: { fixtureId: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.SPORTMONKS_API_KEY;
    if (!apiKey) {
      return { match: null, error: "API key not configured" };
    }

    try {
      const url = `https://api.sportmonks.com/v3/football/fixtures/${data.fixtureId}?api_token=${apiKey}&include=participants;scores;state;league.country;statistics`;
      const res = await fetch(url);

      if (!res.ok) {
        return { match: null, error: `API error: ${res.status}` };
      }

      const json = await res.json();
      const f = json.data;
      if (!f || !f.participants || f.participants.length < 2) {
        return { match: null, error: "Fixture not found" };
      }

      const mapped = mapFixture(f);
      return {
        match: mapped
          ? { ...mapped, statistics: f.statistics || [] }
          : null,
        error: mapped ? null : "Failed to map fixture",
      };
    } catch (err) {
      console.error("SportMonks fixture detail error:", err);
      return { match: null, error: "Failed to fetch fixture details" };
    }
  });
