import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!url || !key) {
          return Response.json({ error: "Missing env" }, { status: 500 });
        }

        // Get auth token
        const authHeader = request.headers.get("authorization") || request.headers.get("cookie");
        const admin = createClient(url, key, { auth: { persistSession: false } });

        const body = await request.json();
        const { amount } = body as { amount: number };
        if (!amount || amount < 5 || amount > 250000) {
          return Response.json({ error: "Amount must be between 5 and 250,000" }, { status: 400 });
        }

        // For mock deposit: get any user's wallet and credit it
        // In production, this would verify payment via M-PESA callback
        // For now, we find all wallets and credit the first one (demo)
        const { data: wallets } = await admin.from("wallets").select("*").limit(1);
        if (!wallets || wallets.length === 0) {
          return Response.json({ error: "No wallet found" }, { status: 404 });
        }

        const wallet = wallets[0];
        const newBalance = +(Number(wallet.balance) + amount).toFixed(2);

        await admin.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);

        // Record transaction
        await admin.from("transactions").insert({
          wallet_id: wallet.id,
          type: "deposit",
          amount: amount,
          status: "successful",
          description: "M-PESA Deposit (demo)",
        });

        return Response.json({ success: true, newBalance });
      },
    },
  },
});
