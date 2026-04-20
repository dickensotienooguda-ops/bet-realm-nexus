import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { CategoryTabs } from "@/components/CategoryTabs";
import { Clock, CheckCircle, XCircle } from "lucide-react";

export const Route = createFileRoute("/my-bets")({
  head: () => ({
    meta: [
      { title: "My Bets — BetPro" },
      { name: "description", content: "View your active, settled and cancelled bets" },
    ],
  }),
  component: MyBetsPage,
});

const betTabs = [
  { id: "active", label: "Active" },
  { id: "settled", label: "Settled" },
  { id: "cancelled", label: "Cancelled" },
];

function MyBetsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar balance="0.00" currency="KES" />

      <div className="px-4 py-3">
        <h1 className="text-lg font-bold">My Bets</h1>
      </div>

      <CategoryTabs tabs={betTabs} />

      {/* Empty state */}
      <div className="flex flex-col items-center px-4 pt-20">
        <Clock className="mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No bets yet</p>
        <p className="mt-1 text-xs text-muted-foreground">Your bets will appear here</p>
      </div>

      <BottomNav />
    </div>
  );
}
