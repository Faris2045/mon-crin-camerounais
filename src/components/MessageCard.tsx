import { MapPin, Flag, Clock, Flame } from "lucide-react";
import { KongossaMessage } from "@/lib/store";
import { motion } from "framer-motion";

interface Props {
  message: KongossaMessage;
  userId: string;
  onLike: (id: string) => void;
  onTap: (id: string) => void;
  onReport: (id: string) => void;
  isHot?: boolean;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return "Il y a 1j+";
}

function formatDistance(meters: number): string {
  if (meters < 100) return "Tout près";
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function MessageCard({ message, userId, onLike, onTap, onReport, isHot }: Props) {
  const liked = message.likedBy.includes(userId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 mb-3 shadow-sm relative ${isHot ? "bg-gradient-to-r from-card to-kongossa-bubble border-2 border-secondary/30" : "bg-card"}`}
      onClick={() => onTap(message.id)}
    >
      {isHot && (
        <div className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 animate-pulse-hot shadow-md">
          <Flame className="w-3 h-3" /> Kongossa chaud!
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-sm text-foreground">{message.author}</span>
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{formatDistance(message.distance)}</span>
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(message.timestamp)}</span>
        </div>
      </div>

      <p className="text-foreground text-[15px] leading-relaxed mb-3">{message.text}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); onLike(message.id); }}
            className={`flex items-center gap-1 text-sm font-semibold transition-colors ${liked ? "text-kongossa-hot" : "text-muted-foreground"}`}
          >
            <span className="text-base leading-none">{liked ? "❤️" : "🤍"}</span>
            {message.likes}
          </button>
          <button className="flex items-center gap-1 text-sm text-muted-foreground font-semibold">
            <span className="text-base leading-none">💬</span>
            {message.comments.length}
          </button>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onReport(message.id); }}
          className="text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
