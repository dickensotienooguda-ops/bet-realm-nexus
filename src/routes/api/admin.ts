import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { createClient } = await import("@supabase/supabase-js");
        const url = process.env.SUPABASE_URL!;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        if (!url || !key) {
          return Response.json({ error: "Missing env" }, { status: 500 });
        }
        const admin = createClient(url, key, { auth: { persistSession: false } });

        const reqUrl = new URL(request.url);
        const tab = reqUrl.searchParams.get("tab") || "users";

        // Stats
        const [
          { count: userCount },
          { count: betCount },
          { count: txCount },
        ] = await Promise.all([
          admin.from("profiles").select("*", { count: "exact", head: true }),
          admin.from("bets").select("*", { count: "exact", head: true }),
          admin.from("transactions").select("*", { count: "exact", head: true }),
        ]);

        const { data: wageredData } = await admin.from("bets").select("stake");
        const totalWagered = (wageredData || []).reduce((sum, b) => sum + Number(b.stake), 0);

        const stats = {
          users: userCount || 0,
          bets: betCount || 0,
          transactions: txCount || 0,
          totalWagered,
        };

        let data: any[] = [];

        switch (tab) {
          case "users": {
            const { data: profiles } = await admin
              .from("profiles")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50);
            data = profiles || [];
            break;
          }
          case "bets": {
            const { data: bets } = await admin
              .from("bets")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50);
            data = bets || [];
            break;
          }
          case "transactions": {
            const { data: txs } = await admin
              .from("transactions")
              .select("*")
              .order("created_at", { ascending: false })
              .limit(50);
            data = txs || [];
            break;
          }
        }

        return Response.json({ data, stats });
      },
    },
  },
});
