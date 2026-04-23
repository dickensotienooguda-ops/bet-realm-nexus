import { createFileRoute } from "@tanstack/react-router";
import { getFixtureDetailsData } from "@/lib/sportmonks.functions";

export const Route = createFileRoute("/api/fixture-details")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const fixtureId = url.searchParams.get("fixtureId");

        if (!fixtureId) {
          return Response.json({ match: null, error: "Missing fixtureId" }, { status: 400 });
        }

        const result = await getFixtureDetailsData({ fixtureId });

        return Response.json(result);
      },
    },
  },
});