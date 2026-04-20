import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Crown, Star, Trophy, Shield, Diamond } from "lucide-react";

export const Route = createFileRoute("/vip")({
  head: () => ({
    meta: [
      { title: "VIP Program — BetPro" },
      { name: "description", content: "Exclusive VIP rewards and benefits" },
    ],
  }),
  component: VipPage,
});

const tiers = [
  { name: "Bronze", icon: Shield, level: 1, color: "text-orange-400", bg: "bg-orange-400/10", cashback: "1%", minWager: "KES 0" },
  { name: "Silver", icon: Star, level: 2, color: "text-gray-300", bg: "bg-gray-300/10", cashback: "2%", minWager: "KES 50,000" },
  { name: "Gold", icon: Trophy, level: 3, color: "text-yellow-400", bg: "bg-yellow-400/10", cashback: "5%", minWager: "KES 250,000" },
  { name: "Platinum", icon: Crown, level: 4, color: "text-blue-300", bg: "bg-blue-300/10", cashback: "7.5%", minWager: "KES 1,000,000" },
  { name: "Elite", icon: Diamond, level: 5, color: "text-primary", bg: "bg-primary/10", cashback: "10%", minWager: "KES 5,000,000" },
];

function VipPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/profile" className="rounded-lg bg-surface-elevated p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">VIP Program</h1>
        <div className="w-9" />
      </div>

      {/* Hero */}
      <div className="mx-4 mt-4 rounded-xl gradient-emerald p-6 text-center">
        <Crown className="mx-auto h-10 w-10 text-primary-foreground" />
        <h2 className="mt-2 text-xl font-bold text-primary-foreground">Earn More, Play More</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Level up through our VIP program and unlock exclusive rewards
        </p>
      </div>

      {/* Current tier */}
      <div className="mx-4 mt-4 rounded-xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/10">
            <Shield className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Current Tier</p>
            <p className="text-lg font-bold text-orange-400">Bronze</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress to Silver</span>
            <span>KES 0 / 50,000</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface-elevated">
            <div className="h-2 w-0 rounded-full bg-primary transition-all" />
          </div>
        </div>
      </div>

      {/* Tiers list */}
      <div className="mx-4 mt-6">
        <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">All Tiers</h3>
        <div className="space-y-2">
          {tiers.map((tier) => (
            <div key={tier.name} className="flex items-center gap-3 rounded-xl bg-card p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tier.bg}`}>
                <tier.icon className={`h-5 w-5 ${tier.color}`} />
              </div>
              <div className="flex-1">
                <p className={`font-semibold ${tier.color}`}>{tier.name}</p>
                <p className="text-xs text-muted-foreground">Min wager: {tier.minWager}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-primary">{tier.cashback}</p>
                <p className="text-[10px] text-muted-foreground">Cashback</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
