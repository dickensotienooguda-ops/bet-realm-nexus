import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/deposit-status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apiKey = process.env.LIPWA_API_KEY;
        if (!supabaseUrl || !anonKey || !apiKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        const token = authHeader.slice(7);
        const userClient = createClient(supabaseUrl, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData?.user) {
          return Response.json({ error: "Invalid session" }, { status: 401 });
        }
        const userId = userData.user.id;

        const url = new URL(request.url);
        const checkoutId = url.searchParams.get("checkout_id");
        if (!checkoutId) {
          return Response.json({ error: "Missing checkout_id" }, { status: 400 });
        }

        // Find transaction belonging to this user
        const { data: wallet } = await supabaseAdmin
          .from("wallets")
          .select("id, balance")
          .eq("user_id", userId)
          .single();

        if (!wallet) return Response.json({ error: "Wallet not found" }, { status: 404 });

        const { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("status, amount")
          .eq("checkout_id", checkoutId)
          .eq("wallet_id", wallet.id)
          .single();

        if (!tx) return Response.json({ status: "unknown" });

        // If still pending, optionally poll Lipwa for the latest status
        if (tx.status === "pending") {
          try {
            const lipwaRes = await fetch(
              `https://pay.lipwa.app/api/status?ref=${encodeURIComponent(checkoutId)}`,
              { headers: { Authorization: `Bearer ${apiKey}` } }
            );
            const lipwaData = await lipwaRes.json().catch(() => ({}));
            if (lipwaData?.status === "payment.success") {
              const newBalance = +(Number(wallet.balance) + Number(tx.amount)).toFixed(2);
              await supabaseAdmin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
              await supabaseAdmin
                .from("transactions")
                .update({
                  status: "successful",
                  description: `M-PESA Deposit (${lipwaData.receipt || "completed"})`,
                })
                .eq("checkout_id", checkoutId);
              return Response.json({ status: "successful", balance: newBalance });
            }
            if (lipwaData?.status === "payment.failed") {
              await supabaseAdmin
                .from("transactions")
                .update({ status: "failed", description: "M-PESA Deposit failed" })
                .eq("checkout_id", checkoutId);
              return Response.json({ status: "failed" });
            }
          } catch {
            /* fall through */
          }
        }

        if (tx.status === "successful") {
          return Response.json({ status: "successful", balance: Number(wallet.balance) });
        }
        return Response.json({ status: tx.status });
      },
    },
  },
});
