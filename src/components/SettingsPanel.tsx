import { MapPin, User, RefreshCw } from "lucide-react";
import { getAreaById } from "@/components/AreaSelector";

interface Props {
  username: string;
  areaId: string;
  radius: number;
  onRadiusChange: (r: number) => void;
  onChangeArea: () => void;
  locationError: boolean;
}

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
];

export default function SettingsPanel({ username, areaId, radius, onRadiusChange, onChangeArea, locationError }: Props) {
  const area = getAreaById(areaId);

  return (
    <div className="p-4">
      <h2 className="text-lg font-extrabold text-foreground mb-6">Réglages</h2>

      {/* Identity card */}
      <div className="bg-card rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            {area?.emoji || "🏙️"}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Ton identité anonyme</p>
            <p className="font-bold text-foreground">{username}</p>
            <p className="text-xs text-primary font-semibold">{area?.label || "Espace public"}</p>
          </div>
          <button
            onClick={onChangeArea}
            className="bg-primary/10 text-primary p-2 rounded-xl active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Radius */}
      <div className="bg-card rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Rayon de détection</span>
        </div>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onRadiusChange(opt.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                radius === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {locationError && (
        <div className="bg-secondary/10 rounded-2xl p-4 text-sm text-foreground">
          <p className="font-bold mb-1">📍 Localisation non disponible</p>
          <p className="text-muted-foreground text-xs">L'application utilise une position par défaut (Douala). Active la géolocalisation pour une meilleure expérience.</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-xs font-bold text-primary/60">KONGOSSA v1.0</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Ton réseau local anonyme 🇨🇲</p>
      </div>
    </div>
  );
}
