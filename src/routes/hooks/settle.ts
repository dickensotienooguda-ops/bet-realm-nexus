import { createFileRoute } from "@tanstack/react-router";
import { runSettlement } from "@/lib/settlement.functions";

export const Route = createFileRoute("/hooks/settle")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify this is from pg_cron or authorized caller
        const authHeader = request.headers.get("authorization");
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!authHeader || !anonKey || authHeader !== `Bearer ${anonKey}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await runSettlement();
        console.log("Cron settlement result:", JSON.stringify(result));

        return Response.json(result);
      },
    },
  },
});
