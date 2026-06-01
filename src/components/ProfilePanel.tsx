import { MapPin, RefreshCw, Heart, MessageCircle, Megaphone, Radar } from "lucide-react";
import { motion } from "framer-motion";
import { getAreaById } from "@/components/AreaSelector";
import { KongossaMessage } from "@/lib/store";

interface Props {
  username: string;
  areaId: string;
  radius: number;
  stats: { posts: number; likesReceived: number; commentsReceived: number };
  myMessages: KongossaMessage[];
  onRadiusChange: (r: number) => void;
  onChangeArea: () => void;
  locationError: boolean;
}

const RADIUS_OPTIONS = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
];

function timeAgo(timestamp: number): string {
  const mins = Math.floor((Date.now() - timestamp) / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return "Il y a 1j+";
}

export default function ProfilePanel({
  username,
  areaId,
  radius,
  stats,
  myMessages,
  onRadiusChange,
  onChangeArea,
  locationError,
}: Props) {
  const area = getAreaById(areaId);

  return (
    <div className="pb-6">
      <h2 className="text-lg font-extrabold text-foreground mb-4">Mon profil</h2>

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-3xl p-5 shadow-lg mb-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center text-3xl">
            {area?.emoji || "🏙️"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary-foreground/70">Identité anonyme</p>
            <p className="font-black text-xl truncate">{username}</p>
            <p className="text-xs text-primary-foreground/90 font-semibold">{area?.label || "Espace public"}</p>
          </div>
          <button
            onClick={onChangeArea}
            className="bg-primary-foreground/20 p-2.5 rounded-xl active:scale-95 transition-transform"
            aria-label="Changer de zone"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: Megaphone, value: stats.posts, label: "Kongossas" },
          { icon: Heart, value: stats.likesReceived, label: "J'aime" },
          { icon: MessageCircle, value: stats.commentsReceived, label: "Commentaires" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="bg-card rounded-2xl p-3 text-center shadow-sm">
            <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="font-black text-foreground text-lg leading-none">{value}</p>
            <p className="text-[10px] text-muted-foreground font-semibold mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Radius */}
      <div className="bg-card rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Radar className="w-4 h-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Rayon de détection</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Tu vois les kongossas dans ce rayon. Les plus populaires dépassent cette limite et passent en Tendances.
        </p>
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
        <div className="bg-secondary/10 rounded-2xl p-4 text-sm text-foreground mb-4">
          <p className="font-bold mb-1">📍 Localisation non disponible</p>
          <p className="text-muted-foreground text-xs">
            L'application utilise une position par défaut (Douala). Active la géolocalisation pour une meilleure expérience.
          </p>
        </div>
      )}

      {/* My kongossas */}
      <h3 className="font-extrabold text-foreground text-sm mb-2 mt-6">Mes kongossas</h3>
      {myMessages.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 text-center shadow-sm">
          <Megaphone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm font-semibold">Tu n'as pas encore lancé de kongossa</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myMessages.map((m) => (
            <div key={m.id} className="bg-card rounded-2xl p-3 shadow-sm">
              <p className="text-foreground text-sm leading-relaxed mb-2">{m.text}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{m.likes}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" />{m.comments.length}</span>
                <span className="ml-auto">{timeAgo(m.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-xs font-bold text-primary/60">KONGOSSA v1.0</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
          <MapPin className="w-3 h-3" /> Les infos de proximité, en temps réel
        </p>
      </div>
    </div>
  );
}
