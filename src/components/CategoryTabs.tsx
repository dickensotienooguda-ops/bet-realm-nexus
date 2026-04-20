import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface CategoryTabsProps {
  tabs: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
}

export function CategoryTabs({ tabs, activeTab, onTabChange }: CategoryTabsProps) {
  const [active, setActive] = useState(activeTab || tabs[0]?.id);

  const handleClick = (id: string) => {
    setActive(id);
    onTabChange?.(id);
  };

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleClick(tab.id)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "bg-primary text-primary-foreground"
              : "bg-surface-elevated text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs ${active === tab.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
