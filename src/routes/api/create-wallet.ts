import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/create-wallet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!url || !key) {
          return Response.json({ error: "Missing env" }, { status: 500 });
        }
        const admin = createClient(url, key, { auth: { persistSession: false } });

        const body = await request.json();
        const { userId, currencyCode } = body as { userId: string; currencyCode: string };
        if (!userId || !currencyCode) {
          return Response.json({ error: "Missing userId or currencyCode" }, { status: 400 });
        }

        const { error } = await admin.from("wallets").insert({
          user_id: userId,
          currency_code: currencyCode,
          balance: 0,
          bonus_balance: 0,
        });

        if (error && !error.message.includes("duplicate")) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        return Response.json({ success: true });
      },
    },
  },
});
