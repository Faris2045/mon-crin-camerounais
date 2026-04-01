import { MapPin, User } from "lucide-react";

interface Props {
  username: string;
  radius: number;
  onRadiusChange: (r: number) => void;
  locationError: boolean;
}

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
];

export default function SettingsPanel({ username, radius, onRadiusChange, locationError }: Props) {
  return (
    <div className="p-4">
      <h2 className="text-lg font-extrabold text-foreground mb-6">Réglages</h2>

      <div className="bg-card rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ton identité anonyme</p>
            <p className="font-bold text-foreground">{username}</p>
          </div>
        </div>
      </div>

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

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">Kongossa Net v1.0</p>
        <p className="text-xs text-muted-foreground">Fait avec ❤️ au Cameroun 🇨🇲</p>
      </div>
    </div>
  );
}
