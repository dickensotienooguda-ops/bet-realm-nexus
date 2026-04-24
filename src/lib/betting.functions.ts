import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const placeBetSchema = z.object({
  selections: z.array(z.object({
    matchId: z.string().min(1).max(255),
    marketId: z.string().min(1).max(255),
    outcomeKey: z.string().min(1).max(50),
    outcomeLabel: z.string().min(1).max(200),
    odds: z.number().min(1.01).max(10000),
  })).min(1).max(20),
  stake: z.number().min(1).max(1000000),
});

export const placeBet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.infer<typeof placeBetSchema>) => placeBetSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    // 1. Get wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance, currency_code")
      .eq("user_id", userId)
      .single();

    if (walletError || !wallet) {
      return { success: false, error: "Wallet not found" };
    }

    if (wallet.balance < data.stake) {
      return { success: false, error: "Insufficient balance" };
    }

    // 2. Calculate total odds
    const totalOdds = data.selections.reduce((acc, s) => acc * s.odds, 1);
    const potentialPayout = +(totalOdds * data.stake).toFixed(2);
    const betType = data.selections.length === 1 ? "single" : "multi";

    // 3. Create bet
    const { data: bet, error: betError } = await supabase
      .from("bets")
      .insert({
        user_id: userId,
        bet_type: betType as "single" | "multi",
        total_odds: +totalOdds.toFixed(2),
        stake: data.stake,
        potential_payout: potentialPayout,
        status: "open",
      })
      .select("id")
      .single();

    if (betError || !bet) {
      return { success: false, error: "Failed to create bet: " + (betError?.message || "Unknown") };
    }

    // 4. Create bet selections
    const selectionsToInsert = data.selections.map((s) => ({
      bet_id: bet.id,
      market_id: s.marketId,
      match_id: s.matchId,
      outcome_key: s.outcomeKey,
      outcome_label: s.outcomeLabel,
      odds: s.odds,
      status: "pending" as const,
    }));

    const { error: selError } = await supabase
      .from("bet_selections")
      .insert(selectionsToInsert);

    if (selError) {
      return { success: false, error: "Failed to create selections: " + selError.message };
    }

    // 5. Debit wallet — use admin client for this since user can't update their own wallet
    const { createClient } = await import("@supabase/supabase-js");
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const newBalance = +(wallet.balance - data.stake).toFixed(2);
    const { error: debitError } = await adminClient
      .from("wallets")
      .update({ balance: newBalance })
      .eq("id", wallet.id);

    if (debitError) {
      return { success: false, error: "Failed to debit wallet: " + debitError.message };
    }

    // 6. Create transaction record
    await adminClient.from("transactions").insert({
      wallet_id: wallet.id,
      type: "bet" as const,
      amount: -data.stake,
      status: "successful" as const,
      reference: bet.id,
      description: `Bet placed - ${data.selections.length} selection(s)`,
    });

    return { success: true, betId: bet.id, newBalance };
  });
