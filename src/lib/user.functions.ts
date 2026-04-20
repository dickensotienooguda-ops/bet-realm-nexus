import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fetch user wallet balance
export const getWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) return { wallet: null, error: error.message };
    return { wallet: data, error: null };
  });

// Fetch user transactions
export const getTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Get wallet first
    const { data: wallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!wallet) return { transactions: [], error: "No wallet found" };

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { transactions: [], error: error.message };
    return { transactions: data || [], error: null };
  });

// Fetch user bets
export const getUserBets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string }) => input)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    let query = supabase
      .from("bets")
      .select("*, bet_selections(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data.status === "active") {
      query = query.eq("status", "open");
    } else if (data.status === "settled") {
      query = query.in("status", ["won", "lost", "void"]);
    }

    const { data: bets, error } = await query;
    if (error) return { bets: [], error: error.message };
    return { bets: bets || [], error: null };
  });
