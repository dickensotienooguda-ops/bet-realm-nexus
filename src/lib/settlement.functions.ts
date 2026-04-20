import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

interface SettlementResult {
  settledBets: number;
  paidOut: number;
  totalPayout: number;
  errors: string[];
}

/**
 * Determines if an outcome_key wins given final scores and market context.
 */
function doesOutcomeWin(outcomeKey: string, homeGoals: number, awayGoals: number): boolean {
  const totalGoals = homeGoals + awayGoals;
  const k = outcomeKey.toLowerCase();

  // 1X2
  if (k === "home") return homeGoals > awayGoals;
  if (k === "away") return awayGoals > homeGoals;
  if (k === "draw") return homeGoals === awayGoals;

  // Double Chance
  if (k === "1x") return homeGoals >= awayGoals;
  if (k === "x2") return awayGoals >= homeGoals;
  if (k === "12") return homeGoals !== awayGoals;

  // Over/Under
  if (k === "over" || k.startsWith("over")) return totalGoals > 2.5; // default 2.5
  if (k === "under" || k.startsWith("under")) return totalGoals < 2.5;

  // BTTS
  if (k === "yes") return homeGoals > 0 && awayGoals > 0;
  if (k === "no") return homeGoals === 0 || awayGoals === 0;

  // Correct Score (e.g. "1-0", "2-1")
  if (/^\d+-\d+$/.test(k)) {
    const [h, a] = k.split("-").map(Number);
    return homeGoals === h && awayGoals === a;
  }

  // HT/FT combos (simplified — can't know HT from FT score, mark as void)
  if (k.includes("/")) return false;

  // Draw No Bet — same as 1X2 but draw = void (handled at bet level)
  // Total goals exact
  if (k === "0") return totalGoals === 0;
  if (k === "1") return totalGoals === 1;
  if (k === "2") return totalGoals === 2;
  if (k === "3") return totalGoals === 3;
  if (k === "4+") return totalGoals >= 4;

  // Default: can't determine, mark as loss
  return false;
}

/**
 * Core settlement logic — called by both the server function and the cron hook.
 * Uses the service role key to bypass RLS.
 */
export async function runSettlement(): Promise<SettlementResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.SPORTMONKS_API_KEY;

  if (!url || !key) {
    return { settledBets: 0, paidOut: 0, totalPayout: 0, errors: ["Missing Supabase env vars"] };
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const errors: string[] = [];
  let settledBets = 0;
  let paidOut = 0;
  let totalPayout = 0;

  // 1. Find open bets with pending selections
  const { data: openBets, error: betsErr } = await admin
    .from("bets")
    .select("id, user_id, stake, total_odds, potential_payout, bet_type")
    .eq("status", "open");

  if (betsErr || !openBets || openBets.length === 0) {
    return { settledBets: 0, paidOut: 0, totalPayout: 0, errors: betsErr ? [betsErr.message] : [] };
  }

  // 2. Get all pending selections for these bets
  const betIds = openBets.map((b) => b.id);
  const { data: pendingSelections, error: selErr } = await admin
    .from("bet_selections")
    .select("id, bet_id, match_id, outcome_key, odds, status")
    .in("bet_id", betIds)
    .eq("status", "pending");

  if (selErr || !pendingSelections) {
    return { settledBets: 0, paidOut: 0, totalPayout: 0, errors: [selErr?.message || "No selections"] };
  }

  // 3. Collect unique match IDs that need checking
  const matchIds = [...new Set(pendingSelections.map((s) => s.match_id))];

  // 4. For each match, try to get the result — first from DB, then from SportMonks
  const matchResults = new Map<string, { homeScore: number; awayScore: number; finished: boolean }>();

  // Check DB matches table first
  const { data: dbMatches } = await admin
    .from("matches")
    .select("id, external_id, home_score, away_score, status")
    .in("id", matchIds);

  for (const m of dbMatches || []) {
    if (m.status === "finished") {
      matchResults.set(m.id, {
        homeScore: m.home_score ?? 0,
        awayScore: m.away_score ?? 0,
        finished: true,
      });
    }
  }

  // For matches not yet finished in DB, check SportMonks if API key available
  if (apiKey) {
    const unfinished = matchIds.filter((id) => !matchResults.has(id));
    if (unfinished.length > 0) {
      // Get external_ids for these matches
      const { data: matchRows } = await admin
        .from("matches")
        .select("id, external_id")
        .in("id", unfinished)
        .not("external_id", "is", null);

      for (const row of matchRows || []) {
        if (!row.external_id) continue;
        try {
          const res = await fetch(
            `https://api.sportmonks.com/v3/football/fixtures/${row.external_id}?api_token=${apiKey}&include=participants;scores;state`
          );
          if (!res.ok) continue;
          const json = await res.json();
          const f = json.data;
          if (!f || !f.state) continue;

          const finishedStates = ["FT", "AET", "FT_PEN", "AWARDED"];
          if (!finishedStates.includes(f.state.short_name)) continue;

          const home = f.participants?.find((p: any) => p.meta?.location === "home");
          const away = f.participants?.find((p: any) => p.meta?.location === "away");
          const homeGoals = f.scores?.find((s: any) => s.participant_id === home?.id && s.description === "CURRENT")?.score?.goals ?? 0;
          const awayGoals = f.scores?.find((s: any) => s.participant_id === away?.id && s.description === "CURRENT")?.score?.goals ?? 0;

          matchResults.set(row.id, { homeScore: homeGoals, awayScore: awayGoals, finished: true });

          // Update the match in our DB
          await admin
            .from("matches")
            .update({ status: "finished", home_score: homeGoals, away_score: awayGoals })
            .eq("id", row.id);
        } catch (err) {
          errors.push(`Failed to fetch SportMonks fixture ${row.external_id}: ${err}`);
        }
      }
    }
  }

  // 5. Resolve each pending selection that has a finished match
  for (const sel of pendingSelections) {
    const result = matchResults.get(sel.match_id);
    if (!result || !result.finished) continue;

    const winningKey = determine1X2Winner(result.homeScore, result.awayScore);
    const selResult = sel.outcome_key === winningKey ? "won" : "lost";

    const { error: updateErr } = await admin
      .from("bet_selections")
      .update({ status: selResult })
      .eq("id", sel.id);

    if (updateErr) {
      errors.push(`Failed to update selection ${sel.id}: ${updateErr.message}`);
    }
  }

  // 6. Check each bet: if all selections resolved, settle the bet
  for (const bet of openBets) {
    const { data: allSelections } = await admin
      .from("bet_selections")
      .select("id, status")
      .eq("bet_id", bet.id);

    if (!allSelections || allSelections.length === 0) continue;

    const allResolved = allSelections.every((s) => s.status !== "pending");
    if (!allResolved) continue;

    const allWon = allSelections.every((s) => s.status === "won");
    const anyVoid = allSelections.some((s) => s.status === "void");
    const betStatus = anyVoid ? "void" : allWon ? "won" : "lost";

    // Update bet status
    const { error: betUpdateErr } = await admin
      .from("bets")
      .update({ status: betStatus, settled_at: new Date().toISOString() })
      .eq("id", bet.id);

    if (betUpdateErr) {
      errors.push(`Failed to settle bet ${bet.id}: ${betUpdateErr.message}`);
      continue;
    }

    settledBets++;

    // 7. Payout if won
    if (betStatus === "won") {
      const payoutAmount = bet.potential_payout;

      // Credit wallet
      const { data: wallet } = await admin
        .from("wallets")
        .select("id, balance")
        .eq("user_id", bet.user_id)
        .single();

      if (wallet) {
        const newBalance = +(Number(wallet.balance) + Number(payoutAmount)).toFixed(2);
        await admin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);

        // Create payout transaction
        await admin.from("transactions").insert({
          wallet_id: wallet.id,
          type: "payout" as const,
          amount: payoutAmount,
          status: "successful" as const,
          reference: bet.id,
          description: `Bet won — ${allSelections.length} selection(s)`,
        });

        paidOut++;
        totalPayout += Number(payoutAmount);
      } else {
        errors.push(`Wallet not found for user ${bet.user_id}`);
      }
    }
  }

  return { settledBets, paidOut, totalPayout: +totalPayout.toFixed(2), errors };
}

/**
 * Server function callable from admin UI or other server code.
 */
export const settleOpenBets = createServerFn({ method: "POST" })
  .handler(async () => {
    const result = await runSettlement();
    console.log("Settlement result:", JSON.stringify(result));
    return result;
  });
