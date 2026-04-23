import { createServerFn } from "@tanstack/react-start";

// ─── Shared types ───

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
  sport: string;
  venue?: string;
  round?: string;
}

// ─── Utility helpers ───

function formatKickOff(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    });
  } catch {
    return dateStr;
  }
}

function generateOdds(
  seed: number,
  homeAdv: number,
  awayAdv: number
): { home: number; draw: number; away: number } {
  const diff = awayAdv - homeAdv;
  const homeStr = Math.max(0.2, Math.min(0.7, 0.45 + diff * 0.015));
  const drawP = 0.25;
  const awayP = Math.max(0.12, 1 - homeStr - drawP);
  const v = ((seed % 100) - 50) * 0.002;
  const hP = Math.max(0.12, homeStr + v);
  const aP = Math.max(0.12, awayP - v);
  const dP = Math.max(0.12, 1 - hP - aP);
  const m = 0.92;
  return {
    home: +Math.max(1.05, m / hP).toFixed(2),
    draw: +Math.max(1.05, m / dP).toFixed(2),
    away: +Math.max(1.05, m / aP).toFixed(2),
  };
}

// ─── SportMonks football ───

interface SMFixture {
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

function smStatus(state: string): "upcoming" | "live" | "finished" {
  if (["LIVE", "HT", "ET", "PEN_LIVE", "BREAK", "1ST_HALF", "2ND_HALF"].includes(state)) return "live";
  if (["FT", "AET", "FT_PEN", "POSTP", "CANCL", "ABAN", "AWARDED"].includes(state)) return "finished";
  return "upcoming";
}

function mapSMFixture(f: SMFixture): MatchResponse | null {
  if (!f.participants || f.participants.length < 2) return null;
  const home = f.participants.find((p) => p.meta?.location === "home") || f.participants[0];
  const away = f.participants.find((p) => p.meta?.location === "away") || f.participants[1];
  if (!home || !away) return null;
  const hScore = f.scores?.find((s) => s.participant_id === home.id && s.description === "CURRENT")?.score?.goals ?? 0;
  const aScore = f.scores?.find((s) => s.participant_id === away.id && s.description === "CURRENT")?.score?.goals ?? 0;
  const status = smStatus(f.state?.short_name || "NS");
  const hPos = home.meta?.position || 10;
  const aPos = away.meta?.position || 10;
  return {
    id: f.id.toString(),
    externalId: f.id,
    homeTeam: home.name,
    awayTeam: away.name,
    homeLogo: home.image_path || "",
    awayLogo: away.image_path || "",
    league: f.league ? `${f.league.country?.name || ""} • ${f.league.name || ""}` : "Football",
    leagueLogo: f.league?.image_path || "",
    kickOff: f.starting_at,
    kickOffDisplay: status === "live" ? "LIVE" : formatKickOff(f.starting_at),
    status,
    homeScore: hScore,
    awayScore: aScore,
    markets: 14,
    odds: generateOdds(f.id, hPos, aPos),
    homePosition: hPos,
    awayPosition: aPos,
    sport: "soccer",
  };
}

async function fetchSMPage(url: string): Promise<SMFixture[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error("SM fetch failed:", res.status); return []; }
    const json = await res.json();
    return (json.data || []).filter((f: any) => f.participants?.length >= 2);
  } catch (err) { console.error("SM error:", err); return []; }
}

async function fetchFootball(apiKey: string, live: boolean, date?: string): Promise<MatchResponse[]> {
  const includes = "participants;scores;state;league.country";
  const perPage = 50;
  const results: MatchResponse[] = [];
  try {
    if (live) {
      const fixtures = await fetchSMPage(
        `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${apiKey}&include=${includes}&per_page=${perPage}`
      );
      results.push(...(fixtures.map(mapSMFixture).filter(Boolean) as MatchResponse[]));
    } else {
      const today = date || new Date().toISOString().split("T")[0];
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().split("T")[0];
        const url = `https://api.sportmonks.com/v3/football/fixtures/date/${ds}?api_token=${apiKey}&include=${includes}&per_page=${perPage}`;
        const p1 = await fetchSMPage(url);
        results.push(...(p1.map(mapSMFixture).filter(Boolean) as MatchResponse[]));
        if (p1.length >= perPage) {
          const p2 = await fetchSMPage(`${url}&page=2`);
          results.push(...(p2.map(mapSMFixture).filter(Boolean) as MatchResponse[]));
        }
      }
    }
  } catch (err) { console.error("Football fetch err:", err); }
  return results;
}

// ─── ESPN API for basketball, baseball, tennis, cricket, rugby ───

const ESPN_SPORTS: Record<string, { path: string; league: string }> = {
  basketball: { path: "basketball/nba", league: "NBA" },
  baseball: { path: "baseball/mlb", league: "MLB" },
  tennis_atp: { path: "tennis/atp", league: "ATP Tour" },
  tennis_wta: { path: "tennis/wta", league: "WTA Tour" },
  cricket: { path: "cricket", league: "Cricket" },
  rugby: { path: "rugby/rugby-union", league: "Rugby Union" },
};

interface ESPNEvent {
  id: string;
  name: string;
  date: string;
  shortName?: string;
  competitions: Array<{
    id: string;
    venue?: { fullName?: string };
    status: {
      type: { name: string; description: string };
      displayClock?: string;
    };
    competitors: Array<{
      homeAway: string;
      score?: string;
      team: {
        id: string;
        displayName: string;
        abbreviation: string;
        logo: string;
      };
      athlete?: { displayName: string; flag?: { href: string } };
    }>;
    notes?: Array<{ headline?: string }>;
  }>;
  season?: { slug?: string };
}

function espnStatus(name: string): "upcoming" | "live" | "finished" {
  if (name === "STATUS_IN_PROGRESS" || name === "STATUS_HALFTIME" || name === "STATUS_END_PERIOD") return "live";
  if (name === "STATUS_FINAL" || name === "STATUS_POSTPONED" || name === "STATUS_CANCELED") return "finished";
  return "upcoming";
}

function mapESPNEvent(e: ESPNEvent, sport: string): MatchResponse | null {
  const comp = e.competitions?.[0];
  if (!comp || !comp.competitors || comp.competitors.length < 2) return null;

  const homeComp = comp.competitors.find((c) => c.homeAway === "home") || comp.competitors[0];
  const awayComp = comp.competitors.find((c) => c.homeAway === "away") || comp.competitors[1];

  // For tennis, use athlete name if available
  const homeName = homeComp.athlete?.displayName || homeComp.team?.displayName || "TBD";
  const awayName = awayComp.athlete?.displayName || awayComp.team?.displayName || "TBD";
  const homeLogo = homeComp.team?.logo || "";
  const awayLogo = awayComp.team?.logo || "";

  const status = espnStatus(comp.status?.type?.name || "");
  const hScore = parseInt(homeComp.score || "0", 10) || 0;
  const aScore = parseInt(awayComp.score || "0", 10) || 0;
  const numId = parseInt(e.id, 10) || parseInt(comp.id, 10) || 0;

  const leagueInfo = ESPN_SPORTS[sport]?.league || sport;
  const round = comp.notes?.[0]?.headline || "";

  return {
    id: `espn-${sport}-${e.id}`,
    externalId: numId,
    homeTeam: homeName,
    awayTeam: awayName,
    homeLogo,
    awayLogo,
    league: round ? `${leagueInfo} • ${round}` : leagueInfo,
    leagueLogo: "",
    kickOff: e.date,
    kickOffDisplay: status === "live"
      ? (comp.status?.displayClock || "LIVE")
      : formatKickOff(e.date),
    status,
    homeScore: hScore,
    awayScore: aScore,
    markets: sport === "tennis" ? 6 : 10,
    odds: generateOdds(numId, 10, 10),
    sport: sport.startsWith("tennis") ? "tennis" : sport,
    venue: comp.venue?.fullName,
    round,
  };
}

async function fetchESPNSport(sportKey: string): Promise<MatchResponse[]> {
  const info = ESPN_SPORTS[sportKey];
  if (!info) return [];

  // Get today + next 5 days of data
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 5);
  const dateRange = `${today.toISOString().split("T")[0].replace(/-/g, "")}-${end.toISOString().split("T")[0].replace(/-/g, "")}`;

  const url = `https://site.api.espn.com/apis/site/v2/sports/${info.path}/scoreboard?dates=${dateRange}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`ESPN ${sportKey} failed:`, res.status);
      return [];
    }
    const json = await res.json();
    const events: ESPNEvent[] = json.events || [];

    // For tennis tournaments, the event itself might be the tournament
    // and competitions are individual matches
    if (sportKey.startsWith("tennis")) {
      const matches: MatchResponse[] = [];
      for (const evt of events) {
        if (evt.competitions && evt.competitions.length > 0) {
          // Each competition is a match
          for (const comp of evt.competitions) {
            const fakeEvt: ESPNEvent = {
              ...evt,
              id: comp.id,
              competitions: [comp],
            };
            const mapped = mapESPNEvent(fakeEvt, sportKey);
            if (mapped && mapped.homeTeam !== "TBD" && mapped.awayTeam !== "TBD") {
              matches.push(mapped);
            }
          }
        }
      }
      return matches;
    }

    return events.map((e) => mapESPNEvent(e, sportKey)).filter(Boolean) as MatchResponse[];
  } catch (err) {
    console.error(`ESPN ${sportKey} error:`, err);
    return [];
  }
}

async function fetchAllESPN(sportFilter?: string): Promise<MatchResponse[]> {
  const sportsToFetch: string[] = [];

  if (!sportFilter || sportFilter === "all") {
    sportsToFetch.push("basketball", "baseball", "tennis_atp", "tennis_wta", "cricket", "rugby");
  } else if (sportFilter === "tennis") {
    sportsToFetch.push("tennis_atp", "tennis_wta");
  } else if (ESPN_SPORTS[sportFilter]) {
    sportsToFetch.push(sportFilter);
  }

  const results = await Promise.all(sportsToFetch.map(fetchESPNSport));
  return results.flat();
}

// ─── Main exported functions ───

export async function getFixturesData(data: { date?: string; live?: boolean; days?: number; sport?: string }) {
  const apiKey = process.env.SPORTMONKS_API_KEY;
  const sport = data.sport || "all";
  const allMatches: MatchResponse[] = [];
  const errors: string[] = [];

  if (sport === "all" || sport === "soccer") {
    if (!apiKey) {
      errors.push("Sports feed not configured for football");
    } else {
      try {
        const fm = await fetchFootball(apiKey, Boolean(data.live), data.date);
        allMatches.push(...fm);
      } catch (err) {
        console.error("Football error:", err);
        errors.push("Failed to fetch football");
      }
    }
  }

  if (sport === "all" || sport !== "soccer") {
    try {
      const espn = await fetchAllESPN(sport === "all" ? "all" : sport);
      allMatches.push(...espn);
    } catch (err) {
      console.error("ESPN error:", err);
      errors.push("Failed to fetch multi-sport data");
    }
  }

  allMatches.sort((a, b) => {
    const order = { live: 0, upcoming: 1, finished: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return new Date(a.kickOff).getTime() - new Date(b.kickOff).getTime();
  });

  return { matches: allMatches, error: errors.length > 0 ? errors.join("; ") : null, fallback: false };
}

export const fetchFixtures = createServerFn({ method: "POST" })
  .inputValidator((input: { date?: string; live?: boolean; days?: number; sport?: string }) => input)
  .handler(async ({ data }) => getFixturesData(data));

export async function getFixtureDetailsData(data: { fixtureId: string }) {
  const fid = data.fixtureId;

  if (fid.startsWith("espn-")) {
    const parts = fid.replace("espn-", "").split("-");
    const sportKey = parts.slice(0, -1).join("-") || parts[0];
    const eventId = parts[parts.length - 1];

    let espnPath = "";
    const resolvedKey = sportKey.startsWith("tennis") ? sportKey : sportKey;
    const info = ESPN_SPORTS[resolvedKey];
    if (info) {
      espnPath = info.path;
    } else {
      const fallbacks: Record<string, string> = {
        basketball: "basketball/nba",
        baseball: "baseball/mlb",
        tennis: "tennis/atp",
        cricket: "cricket",
        rugby: "rugby/rugby-union",
      };
      espnPath = fallbacks[sportKey] || `${sportKey}/scoreboard`;
    }

    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/summary?event=${eventId}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const header = json.header;
        const comps = header?.competitions?.[0] || json.competitions?.[0];
        if (comps && comps.competitors?.length >= 2) {
          const hc = comps.competitors.find((c: any) => c.homeAway === "home") || comps.competitors[0];
          const ac = comps.competitors.find((c: any) => c.homeAway === "away") || comps.competitors[1];
          const status = espnStatus(comps.status?.type?.name || "");
          const numId = parseInt(eventId, 10) || 0;
          const match: MatchResponse & { statistics: any[] } = {
            id: fid,
            externalId: numId,
            homeTeam: hc.team?.displayName || hc.athlete?.displayName || "Home",
            awayTeam: ac.team?.displayName || ac.athlete?.displayName || "Away",
            homeLogo: hc.team?.logos?.[0]?.href || hc.team?.logo || "",
            awayLogo: ac.team?.logos?.[0]?.href || ac.team?.logo || "",
            league: header?.league?.name || json.league?.name || sportKey,
            leagueLogo: header?.league?.logos?.[0]?.href || "",
            kickOff: header?.competitions?.[0]?.date || new Date().toISOString(),
            kickOffDisplay: status === "live" ? "LIVE" : formatKickOff(header?.competitions?.[0]?.date || ""),
            status,
            homeScore: parseInt(hc.score || "0", 10) || 0,
            awayScore: parseInt(ac.score || "0", 10) || 0,
            markets: 10,
            odds: generateOdds(numId, 10, 10),
            sport: sportKey.startsWith("tennis") ? "tennis" : sportKey,
            venue: comps.venue?.fullName,
            statistics: json.boxscore?.teams || [],
          };
          return { match, error: null };
        }
      }

      const sbUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard`;
      const sbRes = await fetch(sbUrl);
      if (sbRes.ok) {
        const sbJson = await sbRes.json();
        const events: ESPNEvent[] = sbJson.events || [];
        const evt = events.find((e) => e.id === eventId);
        if (evt) {
          const mapped = mapESPNEvent(evt, resolvedKey);
          if (mapped) return { match: { ...mapped, statistics: [] }, error: null };
        }
      }

      return { match: null, error: "Event not found" };
    } catch (err) {
      console.error("ESPN detail error:", err);
      return { match: null, error: "Failed to fetch event details" };
    }
  }

  const apiKey = process.env.SPORTMONKS_API_KEY;
  if (!apiKey) return { match: null, error: "API key not configured" };

  try {
    const url = `https://api.sportmonks.com/v3/football/fixtures/${fid}?api_token=${apiKey}&include=participants;scores;state;league.country;statistics`;
    const res = await fetch(url);
    if (!res.ok) return { match: null, error: `API error: ${res.status}` };
    const json = await res.json();
    const f = json.data;
    if (!f || !f.participants || f.participants.length < 2) return { match: null, error: "Fixture not found" };
    const mapped = mapSMFixture(f);
    return {
      match: mapped ? { ...mapped, statistics: f.statistics || [] } : null,
      error: mapped ? null : "Failed to map fixture",
    };
  } catch (err) {
    console.error("SM detail error:", err);
    return { match: null, error: "Failed to fetch fixture details" };
  }
}

export const fetchFixtureDetails = createServerFn({ method: "POST" })
  .inputValidator((input: { fixtureId: string }) => input)
  .handler(async ({ data }) => getFixtureDetailsData(data));
