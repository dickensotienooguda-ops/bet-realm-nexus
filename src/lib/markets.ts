/**
 * Market types and odds generation for betting platform.
 * Generates realistic odds for multiple market types from match data.
 */

export interface MarketOutcome {
  key: string;
  label: string;
  odds: number;
}

export interface Market {
  id: string;
  type: string;
  label: string;
  outcomes: MarketOutcome[];
}

function rnd(min: number, max: number, decimals = 2): number {
  return +(min + Math.random() * (max - min)).toFixed(decimals);
}

/** Seeded random from match id for consistent odds */
function seededRandom(seed: string, index: number): number {
  let hash = 0;
  const str = seed + index.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return (Math.abs(hash) % 10000) / 10000;
}

function sRnd(seed: string, idx: number, min: number, max: number): number {
  return +(min + seededRandom(seed, idx) * (max - min)).toFixed(2);
}

export function generateMarkets(matchId: string, homeOdds?: number, drawOdds?: number, awayOdds?: number): Market[] {
  const h = homeOdds || sRnd(matchId, 0, 1.5, 4.5);
  const d = drawOdds || sRnd(matchId, 1, 2.8, 4.2);
  const a = awayOdds || sRnd(matchId, 2, 1.5, 5.5);

  const markets: Market[] = [];

  // 1. 1X2 (Match Result)
  markets.push({
    id: `${matchId}-1x2`,
    type: "1x2",
    label: "Match Result",
    outcomes: [
      { key: "home", label: "Home", odds: h },
      { key: "draw", label: "Draw", odds: d },
      { key: "away", label: "Away", odds: a },
    ],
  });

  // 2. Double Chance
  markets.push({
    id: `${matchId}-dc`,
    type: "double_chance",
    label: "Double Chance",
    outcomes: [
      { key: "1x", label: "Home or Draw", odds: +Math.max(1.05, 1 / (1/h + 1/d)).toFixed(2) },
      { key: "12", label: "Home or Away", odds: +Math.max(1.05, 1 / (1/h + 1/a)).toFixed(2) },
      { key: "x2", label: "Draw or Away", odds: +Math.max(1.05, 1 / (1/d + 1/a)).toFixed(2) },
    ],
  });

  // 3. Over/Under 2.5 Goals
  markets.push({
    id: `${matchId}-ou25`,
    type: "over_under_2_5",
    label: "Over/Under 2.5",
    outcomes: [
      { key: "over", label: "Over 2.5", odds: sRnd(matchId, 10, 1.6, 2.4) },
      { key: "under", label: "Under 2.5", odds: sRnd(matchId, 11, 1.5, 2.3) },
    ],
  });

  // 4. Over/Under 1.5 Goals
  markets.push({
    id: `${matchId}-ou15`,
    type: "over_under_1_5",
    label: "Over/Under 1.5",
    outcomes: [
      { key: "over", label: "Over 1.5", odds: sRnd(matchId, 12, 1.15, 1.65) },
      { key: "under", label: "Under 1.5", odds: sRnd(matchId, 13, 2.1, 4.5) },
    ],
  });

  // 5. Over/Under 3.5 Goals
  markets.push({
    id: `${matchId}-ou35`,
    type: "over_under_3_5",
    label: "Over/Under 3.5",
    outcomes: [
      { key: "over", label: "Over 3.5", odds: sRnd(matchId, 14, 2.0, 3.5) },
      { key: "under", label: "Under 3.5", odds: sRnd(matchId, 15, 1.2, 1.7) },
    ],
  });

  // 6. Both Teams to Score
  markets.push({
    id: `${matchId}-btts`,
    type: "btts",
    label: "Both Teams to Score",
    outcomes: [
      { key: "yes", label: "Yes", odds: sRnd(matchId, 20, 1.5, 2.2) },
      { key: "no", label: "No", odds: sRnd(matchId, 21, 1.5, 2.3) },
    ],
  });

  // 7. Half-Time Result
  markets.push({
    id: `${matchId}-ht`,
    type: "half_time",
    label: "Half-Time Result",
    outcomes: [
      { key: "home", label: "Home", odds: sRnd(matchId, 30, 2.0, 5.5) },
      { key: "draw", label: "Draw", odds: sRnd(matchId, 31, 1.8, 2.8) },
      { key: "away", label: "Away", odds: sRnd(matchId, 32, 2.5, 7.0) },
    ],
  });

  // 8. Correct Score (popular scores)
  const scores = [
    ["1-0", 33], ["0-1", 34], ["2-1", 35], ["1-2", 36],
    ["2-0", 37], ["0-2", 38], ["1-1", 39], ["0-0", 40],
    ["2-2", 41], ["3-0", 42], ["0-3", 43], ["3-1", 44],
    ["1-3", 45], ["3-2", 46], ["2-3", 47],
  ] as const;
  markets.push({
    id: `${matchId}-cs`,
    type: "correct_score",
    label: "Correct Score",
    outcomes: scores.map(([score, idx]) => ({
      key: score,
      label: score,
      odds: sRnd(matchId, idx as number, 5.0, 35.0),
    })),
  });

  // 9. First Half Over/Under 0.5
  markets.push({
    id: `${matchId}-fhou05`,
    type: "first_half_ou_0_5",
    label: "1st Half Over/Under 0.5",
    outcomes: [
      { key: "over", label: "Over 0.5", odds: sRnd(matchId, 50, 1.3, 1.7) },
      { key: "under", label: "Under 0.5", odds: sRnd(matchId, 51, 2.0, 3.2) },
    ],
  });

  // 10. Draw No Bet
  markets.push({
    id: `${matchId}-dnb`,
    type: "draw_no_bet",
    label: "Draw No Bet",
    outcomes: [
      { key: "home", label: "Home", odds: sRnd(matchId, 60, 1.2, 3.0) },
      { key: "away", label: "Away", odds: sRnd(matchId, 61, 1.3, 3.5) },
    ],
  });

  // 11. Total Goals (Exact)
  markets.push({
    id: `${matchId}-tg`,
    type: "total_goals_exact",
    label: "Total Goals",
    outcomes: [
      { key: "0", label: "0 Goals", odds: sRnd(matchId, 70, 8.0, 18.0) },
      { key: "1", label: "1 Goal", odds: sRnd(matchId, 71, 4.5, 8.0) },
      { key: "2", label: "2 Goals", odds: sRnd(matchId, 72, 3.0, 5.5) },
      { key: "3", label: "3 Goals", odds: sRnd(matchId, 73, 3.5, 6.5) },
      { key: "4+", label: "4+ Goals", odds: sRnd(matchId, 74, 3.0, 5.0) },
    ],
  });

  // 12. Half-Time / Full-Time
  const htft = [
    ["H/H", 80], ["H/D", 81], ["H/A", 82],
    ["D/H", 83], ["D/D", 84], ["D/A", 85],
    ["A/H", 86], ["A/D", 87], ["A/A", 88],
  ] as const;
  markets.push({
    id: `${matchId}-htft`,
    type: "ht_ft",
    label: "HT/FT",
    outcomes: htft.map(([combo, idx]) => ({
      key: combo,
      label: combo,
      odds: sRnd(matchId, idx as number, 3.0, 30.0),
    })),
  });

  // 13. Handicap -1
  markets.push({
    id: `${matchId}-hcp1`,
    type: "handicap_minus_1",
    label: "Handicap (-1)",
    outcomes: [
      { key: "home", label: "Home -1", odds: sRnd(matchId, 90, 2.5, 5.5) },
      { key: "draw", label: "Draw", odds: sRnd(matchId, 91, 3.0, 5.0) },
      { key: "away", label: "Away +1", odds: sRnd(matchId, 92, 1.3, 2.2) },
    ],
  });

  // 14. Win to Nil
  markets.push({
    id: `${matchId}-wtn`,
    type: "win_to_nil",
    label: "Win to Nil",
    outcomes: [
      { key: "home", label: "Home to Nil", odds: sRnd(matchId, 95, 2.5, 6.0) },
      { key: "away", label: "Away to Nil", odds: sRnd(matchId, 96, 3.0, 8.0) },
    ],
  });

  return markets;
}
