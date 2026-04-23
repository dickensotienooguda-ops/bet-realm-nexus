import { createFileRoute } from "@tanstack/react-router";
import { getFixturesData } from "@/lib/sportmonks.functions";

export const Route = createFileRoute("/api/fixtures")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const sport = url.searchParams.get("sport") || undefined;
        const date = url.searchParams.get("date") || undefined;
        const live = url.searchParams.get("live") === "true";

        const result = await getFixturesData({ sport, date, live });

        return Response.json(result);
      },
    },
  },
});