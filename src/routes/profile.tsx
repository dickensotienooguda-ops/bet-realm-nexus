import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Bell, ChevronRight, Users, AlertCircle, Gift, Lock, CreditCard, Clock, Headphones, Trash2 } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Account — BetPro" },
      { name: "description", content: "Manage your account settings" },
    ],
  }),
  component: ProfilePage,
});

const accountItems = [
  { icon: Users, label: "Refer and Earn", desc: "Invite friends, earn rewards", color: "text-primary" },
  { icon: AlertCircle, label: "Deposit Unsuccessful?", desc: "Verify your payment", color: "text-pending" },
  { icon: Gift, label: "Redeem Bonus", desc: "Enter promo code", color: "text-pending" },
  { icon: Lock, label: "Change Password", desc: "Update your security", color: "text-blue-400" },
];

const moreItems = [
  { icon: CreditCard, label: "Transactions", desc: "View all activity", to: "/wallet" },
  { icon: Clock, label: "Bet History", desc: "Your betting records", to: "/my-bets" },
  { icon: Bell, label: "Notifications", desc: "Updates and alerts", badge: 3 },
  { icon: Headphones, label: "Live Support", desc: "Chat with us 24/7", online: true },
];

function ProfilePage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/" className="rounded-lg bg-surface-elevated p-2">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-bold">My Account</h1>
        <div className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">3</span>
        </div>
      </div>

      {/* User info card */}
      <div className="mx-4 mt-4 rounded-xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Users className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold">0797585941</p>
            <p className="text-xs text-muted-foreground">Member since 2024</p>
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div className="mx-4 mt-3 rounded-xl bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <span className="rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary">M-PESA</span>
        </div>
        <p className="mt-1 text-2xl font-bold">KES 0.00</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/wallet" className="rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground">
            ↗ Deposit
          </Link>
          <Link to="/wallet" className="rounded-xl bg-surface-elevated py-2.5 text-center text-sm font-bold">
            ↘ Withdraw
          </Link>
        </div>
      </div>

      {/* Account section */}
      <div className="mt-6 px-4">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Account</p>
        <div className="rounded-xl bg-card">
          {accountItems.map((item, i) => (
            <button key={item.label} className={`flex w-full items-center gap-3 px-4 py-3.5 ${i !== accountItems.length - 1 ? "border-b border-border" : ""}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* More section */}
      <div className="mt-6 px-4">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">More</p>
        <div className="rounded-xl bg-card">
          {moreItems.map((item, i) => (
            <button key={item.label} className={`flex w-full items-center gap-3 px-4 py-3.5 ${i !== moreItems.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-elevated">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              {item.badge && (
                <span className="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">{item.badge}</span>
              )}
              {item.online && (
                <span className="mr-1 flex items-center gap-1 text-xs text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Online
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-6 px-4 pb-4">
        <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Danger Zone</p>
        <div className="rounded-xl bg-card">
          <button className="flex w-full items-center gap-3 px-4 py-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your data</p>
            </div>
            <ChevronRight className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
