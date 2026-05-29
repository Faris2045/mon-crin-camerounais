import { Home, Flame, User } from "lucide-react";

export type Tab = "feed" | "hot" | "settings";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

export default function BottomNav({ active, onChange }: Props) {
  const items: { tab: Tab; icon: typeof Home; label: string }[] = [
    { tab: "feed", icon: Home, label: "Accueil" },
    { tab: "hot", icon: Flame, label: "Tendances" },
    { tab: "settings", icon: User, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-30">
      <div className="flex items-center justify-around py-2">
        {items.map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${active === tab ? "text-primary" : "text-muted-foreground"}`}
          >
            <Icon className="w-5 h-5" strokeWidth={active === tab ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
