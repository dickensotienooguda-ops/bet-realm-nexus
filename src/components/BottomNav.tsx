import { Link, useLocation } from "@tanstack/react-router";
import { Home, Tv, FileText, ClipboardList, User } from "lucide-react";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/live", icon: Tv, label: "Live", badge: undefined as number | undefined },
  { to: "/betslip", icon: FileText, label: "Betslip", isCenter: true },
  { to: "/my-bets", icon: ClipboardList, label: "My Bets" },
  { to: "/profile", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-nav-bg bottom-nav-safe">
      <div className="mx-auto flex max-w-lg items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = item.to === "/" 
            ? location.pathname === "/" 
            : location.pathname.startsWith(item.to);

          if (item.isCenter) {
            return (
              <Link key={item.to} to={item.to} className="relative -mt-5">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors ${
                  isActive ? "bg-primary glow-emerald" : "bg-accent"
                }`}>
                  <item.icon className={`h-6 w-6 ${isActive ? "text-primary-foreground" : "text-foreground"}`} />
                </div>
                <span className={`mt-0.5 block text-center text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link key={item.to} to={item.to} className="flex flex-col items-center gap-0.5 py-1.5">
              <div className="relative">
                <item.icon className={`h-5 w-5 transition-colors ${
                  isActive ? "text-nav-active" : "text-muted-foreground"
                }`} />
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                isActive ? "text-nav-active" : "text-muted-foreground"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
