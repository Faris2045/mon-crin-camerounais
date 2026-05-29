import { motion } from "framer-motion";
import { Siren, MapPin, Navigation, CheckCircle2, ShieldCheck } from "lucide-react";
import type { KongossaAlert } from "@/lib/store";

interface Props {
  alerts: KongossaAlert[];
  myUserId: string;
  onResolve: (id: string) => void;
}

function formatDistance(d: number): string {
  if (d < 1000) return `${Math.round(d)} m`;
  return `${(d / 1000).toFixed(1)} km`;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  return `il y a ${Math.floor(s / 3600)} h`;
}

export default function AlertCenter({ alerts, myUserId, onResolve }: Props) {
  const openMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-16">
        <ShieldCheck className="w-12 h-12 text-primary/40 mx-auto mb-3" />
        <p className="text-foreground font-bold">Aucune alerte en cours</p>
        <p className="text-muted-foreground text-sm mt-1">
          Tout est calme autour de toi. Reste vigilant 🙏
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground font-semibold">
        🚨 {alerts.length} alerte{alerts.length !== 1 ? "s" : ""} d'urgence en cours
      </p>
      {alerts.map((alert) => {
        const mine = alert.authorId === myUserId;
        return (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-destructive/40 rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                <Siren className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-foreground">
                    {mine ? "Ton alerte" : alert.authorName}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    {timeAgo(alert.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-0.5">
                  {alert.message || "Demande d'aide d'urgence"}
                </p>
                <div className="flex items-center gap-1 text-xs text-destructive font-bold mt-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {formatDistance(alert.distance)} de toi
                </div>

                <div className="flex gap-2 mt-3">
                  {!mine && (
                    <button
                      onClick={() => openMaps(alert.lat, alert.lng)}
                      className="flex-1 bg-destructive text-destructive-foreground font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <Navigation className="w-4 h-4" />
                      Localiser
                    </button>
                  )}
                  {mine && (
                    <button
                      onClick={() => onResolve(alert.id)}
                      className="flex-1 bg-primary text-primary-foreground font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Je suis en sécurité
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
