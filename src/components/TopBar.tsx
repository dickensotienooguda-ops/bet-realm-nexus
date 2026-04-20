import { Link } from "@tanstack/react-router";
import { Bell, Search, Wallet } from "lucide-react";

interface TopBarProps {
  balance?: string;
  currency?: string;
}

export function TopBar({ balance = "0.00", currency = "KES" }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">B</span>
          </div>
        </Link>

        {/* Balance + Actions */}
        <div className="flex items-center gap-2">
          <Link to="/wallet" className="flex items-center gap-1.5 rounded-full bg-surface-elevated px-3 py-1.5 text-sm font-semibold">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{currency} {balance}</span>
          </Link>
          <Link to="/wallet" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            Deposit
          </Link>
          <button className="rounded-lg bg-surface-elevated p-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>
          <Link to="/profile" className="relative rounded-lg bg-surface-elevated p-1.5">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
              3
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
