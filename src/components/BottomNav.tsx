import { Home, Flame, User, Siren } from "lucide-react";

export type Tab = "feed" | "hot" | "alert" | "settings";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  alertCount?: number;
}

export default function BottomNav({ active, onChange, alertCount = 0 }: Props) {
  const items: { tab: Tab; icon: typeof Home; label: string }[] = [
    { tab: "feed", icon: Home, label: "Accueil" },
    { tab: "hot", icon: Flame, label: "Tendances" },
    { tab: "alert", icon: Siren, label: "Alertes" },
    { tab: "settings", icon: User, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom z-30">
      <div className="flex items-center justify-around py-2">
        {items.map(({ tab, icon: Icon, label }) => {
          const isAlert = tab === "alert";
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                active === tab
                  ? isAlert ? "text-destructive" : "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active === tab ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{label}</span>
              {isAlert && alertCount > 0 && (
                <span className="absolute -top-0.5 right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-black flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
