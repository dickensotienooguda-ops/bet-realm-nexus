import { createFileRoute, Link } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Bell, ChevronRight, Users, AlertCircle, Gift, Lock, CreditCard, Clock, Headphones, Trash2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Account — BetPro" },
      { name: "description", content: "Manage your account settings" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, session, profile, signOut } = useAuth();
  const [balance, setBalance] = useState("0.00");
  const [currency, setCurrency] = useState("KES");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wallets")
      .select("balance, currency_code")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setBalance(Number(data.balance).toFixed(2));
          setCurrency(data.currency_code);
        }
      });
  }, [user]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link to="/" className="rounded-lg bg-surface-elevated p-2"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold">My Account</h1>
          <div className="w-9" />
        </div>
        <div className="flex flex-col items-center px-4 pt-20">
          <Users className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Login to manage your account</p>
          <Link to="/login" className="mt-4 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground">Login</Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const phone = profile?.phone || user?.user_metadata?.phone || user?.email?.split("@")[0] || "User";

  const accountItems = [
    { icon: Users, label: "Refer and Earn", desc: "Invite friends, earn rewards", color: "text-primary" },
    { icon: AlertCircle, label: "Deposit Unsuccessful?", desc: "Verify your payment", color: "text-pending" },
    { icon: Gift, label: "Redeem Bonus", desc: "Enter promo code", color: "text-pending" },
    { icon: Lock, label: "Change Password", desc: "Update your security", color: "text-blue-400" },
  ];

  const moreItems = [
    { icon: CreditCard, label: "Transactions", desc: "View all activity", to: "/wallet" as const },
    { icon: Clock, label: "Bet History", desc: "Your betting records", to: "/my-bets" as const },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <Link to="/" className="rounded-lg bg-surface-elevated p-2"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">My Account</h1>
        <div className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">3</span>
        </div>
      </div>

      {/* User info */}
      <div className="mx-4 mt-4 rounded-xl bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <Users className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold">{phone}</p>
            <p className="text-xs text-muted-foreground">Member since {new Date(user.created_at).getFullYear()}</p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="mx-4 mt-3 rounded-xl bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <span className="rounded-full border border-primary px-3 py-1 text-xs font-bold text-primary">M-PESA</span>
        </div>
        <p className="mt-1 text-2xl font-bold">{currency} {balance}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link to="/wallet" className="rounded-xl bg-primary py-2.5 text-center text-sm font-bold text-primary-foreground">↗ Deposit</Link>
          <Link to="/wallet" className="rounded-xl bg-surface-elevated py-2.5 text-center text-sm font-bold">↘ Withdraw</Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 overflow-x-auto px-4 py-4">
        {[
          { icon: CreditCard, label: "Transactions", to: "/wallet" as const },
          { icon: Clock, label: "Bet History", to: "/my-bets" as const },
        ].map((item) => (
          <Link key={item.label} to={item.to} className="flex flex-col items-center gap-1.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-elevated">
              <item.icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Account section */}
      <div className="px-4">
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

      {/* Logout + VIP */}
      <div className="mt-6 space-y-2 px-4 pb-4">
        <Link to="/vip" className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium">VIP Program</p>
            <p className="text-xs text-muted-foreground">View your rewards</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl bg-card px-4 py-3.5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <LogOut className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-destructive">Logout</p>
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
