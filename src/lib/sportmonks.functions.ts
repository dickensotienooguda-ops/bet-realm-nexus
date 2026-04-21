import { createServerFn } from "@tanstack/react-start";

interface SportMonksFixture {
  id: number;
  name: string;
  starting_at: string;
  state: { id: number; state: string; short_name: string };
  participants: Array<{
    id: number;
    name: string;
    short_code: string;
    image_path: string;
    meta: { location: string };
  }>;
  scores: Array<{
    participant_id: number;
    score: { goals: number };
    description: string;
  }>;
  league: {
    id: number;
    name: string;
    image_path: string;
    country: { name: string };
  };
  odds: Array<{
    id: number;
    market_id: number;
    label: string;
    value: string;
    name: string;
    market: {
      id: number;
      name: string;
    };
  }>;
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
  odds?: { home: number; draw: number; away: number };
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

function extractOdds(fixture: SportMonksFixture): { home: number; draw: number; away: number } | undefined {
  const oddsData = fixture.odds;
  if (!oddsData || !Array.isArray(oddsData) || oddsData.length === 0) {
    return undefined;
  }

  // Look for Match Result / 1X2 / Full Time Result market
  // SportMonks market_id 1 is typically "Match Winner" / "1X2"
  const matchWinnerOdds = oddsData.filter(
    (o) =>
      o.market_id === 1 ||
      o.market?.name?.toLowerCase().includes("match winner") ||
      o.market?.name?.toLowerCase().includes("full time result") ||
      o.market?.name === "1X2"
  );

  if (matchWinnerOdds.length >= 2) {
    const homeOdd = matchWinnerOdds.find((o) => o.label === "1" || o.label === "Home" || o.name === "Home");
    const drawOdd = matchWinnerOdds.find((o) => o.label === "X" || o.label === "Draw" || o.name === "Draw");
    const awayOdd = matchWinnerOdds.find((o) => o.label === "2" || o.label === "Away" || o.name === "Away");

    if (homeOdd && awayOdd) {
      return {
        home: parseFloat(homeOdd.value) || 1.5,
        draw: drawOdd ? parseFloat(drawOdd.value) || 3.0 : 3.0,
        away: parseFloat(awayOdd.value) || 2.5,
      };
    }
  }

  // Fallback: try any odds with labels 1, X, 2
  const home = oddsData.find((o) => o.label === "1");
  const draw = oddsData.find((o) => o.label === "X");
  const away = oddsData.find((o) => o.label === "2");

  if (home && away) {
    return {
      home: parseFloat(home.value) || 1.5,
      draw: draw ? parseFloat(draw.value) || 3.0 : 3.0,
      away: parseFloat(away.value) || 2.5,
    };
  }

  return undefined;
}

function mapFixture(f: SportMonksFixture): MatchResponse {
  const home = f.participants.find((p) => p.meta?.location === "home") || f.participants[0];
  const away = f.participants.find((p) => p.meta?.location === "away") || f.participants[1];
  const homeScore = f.scores?.find((s) => s.participant_id === home.id && s.description === "CURRENT")?.score?.goals ?? 0;
  const awayScore = f.scores?.find((s) => s.participant_id === away.id && s.description === "CURRENT")?.score?.goals ?? 0;
  const status = mapFixtureStatus(f.state?.short_name || "NS");

  const realOdds = extractOdds(f);

  return {
    id: f.id.toString(),
    externalId: f.id,
    homeTeam: home.name,
    awayTeam: away.name,
    homeLogo: home.image_path || "",
    awayLogo: away.image_path || "",
    league: `${f.league?.country?.name || ""} • ${f.league?.name || ""}`,
    leagueLogo: f.league?.image_path || "",
    kickOff: f.starting_at,
    kickOffDisplay: status === "live" ? "LIVE" : formatKickOff(f.starting_at),
    status,
    homeScore,
    awayScore,
    markets: 14,
    odds: realOdds,
  };
}

export const fetchFixtures = createServerFn({ method: "POST" })
  .inputValidator((input: { date?: string; live?: boolean; days?: number }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.SPORTMONKS_API_KEY;
    if (!apiKey) {
      console.error("SPORTMONKS_API_KEY not set");
      return { matches: [], error: "SportMonks API key not configured" };
    }

    try {
      const today = data.date || new Date().toISOString().split("T")[0];
      const includes = "participants;scores;state;league.country;odds.market";

      if (data.live) {
        const url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${apiKey}&include=${includes}&per_page=100`;
        const res = await fetch(url);
        if (!res.ok) return { matches: [], error: `API error: ${res.status}` };
        const json = await res.json();
        const fixtures: SportMonksFixture[] = (json.data || []).filter((f: any) => f.participants?.length >= 2);
        return { matches: fixtures.map(mapFixture), error: null };
      }

      // Fetch today + tomorrow for more games
      const dates = [today];
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dates.push(tomorrow.toISOString().split("T")[0]);

      const allFixtures: SportMonksFixture[] = [];
      for (const d of dates) {
        const url = `https://api.sportmonks.com/v3/football/fixtures/date/${d}?api_token=${apiKey}&include=${includes}&per_page=100`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const fixtures = (json.data || []).filter((f: any) => f.participants?.length >= 2);
          allFixtures.push(...fixtures);
        }
      }

      return { matches: allFixtures.map(mapFixture), error: null };
    } catch (err) {
      console.error("SportMonks fetch error:", err);
      return { matches: [], error: "Failed to fetch fixtures" };
    }
  });

export const fetchFixtureDetails = createServerFn({ method: "POST" })
  .inputValidator((input: { fixtureId: string }) => input)
  .handler(async ({ data }) => {
    const apiKey = process.env.SPORTMONKS_API_KEY;
    if (!apiKey) {
      return { match: null, error: "SportMonks API key not configured" };
    }

    try {
      const url = `https://api.sportmonks.com/v3/football/fixtures/${data.fixtureId}?api_token=${apiKey}&include=participants;scores;state;league.country;odds.market;statistics`;

      const res = await fetch(url);
      if (!res.ok) {
        return { match: null, error: `API error: ${res.status}` };
      }

      const json = await res.json();
      const f = json.data;
      if (!f || !f.participants || f.participants.length < 2) {
        return { match: null, error: "Fixture not found" };
      }

      const home = f.participants.find((p: any) => p.meta?.location === "home") || f.participants[0];
      const away = f.participants.find((p: any) => p.meta?.location === "away") || f.participants[1];
      const status = mapFixtureStatus(f.state?.short_name || "NS");

      return {
        match: {
          id: f.id.toString(),
          externalId: f.id,
          homeTeam: home.name,
          awayTeam: away.name,
          homeLogo: home.image_path || "",
          awayLogo: away.image_path || "",
          league: `${f.league?.country?.name || ""} • ${f.league?.name || ""}`,
          kickOff: f.starting_at,
          kickOffDisplay: status === "live" ? "LIVE" : formatKickOff(f.starting_at),
          status,
          homeScore: f.scores?.find((s: any) => s.participant_id === home.id && s.description === "CURRENT")?.score?.goals ?? 0,
          awayScore: f.scores?.find((s: any) => s.participant_id === away.id && s.description === "CURRENT")?.score?.goals ?? 0,
          odds: f.odds || [],
          statistics: f.statistics || [],
        },
        error: null,
      };
    } catch (err) {
      console.error("SportMonks fixture detail error:", err);
      return { match: null, error: "Failed to fetch fixture details" };
    }
  });
