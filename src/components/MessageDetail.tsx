import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ThumbsUp, ThumbsDown, MapPin, Clock, Send, Flag, Flame } from "lucide-react";
import { KongossaMessage } from "@/lib/store";

interface Props {
  message: KongossaMessage;
  userId: string;
  onBack: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  onReport: (id: string) => void;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  return `Il y a ${hours}h`;
}

export default function MessageDetail({ message, userId, onBack, onLike, onDislike, onComment, onReport }: Props) {
  const [comment, setComment] = useState("");
  const liked = message.likedBy.includes(userId);
  const disliked = message.dislikedBy.includes(userId);
  const isHot = message.likes >= 50;

  const handleComment = () => {
    if (!comment.trim()) return;
    onComment(message.id, comment.trim());
    setComment("");
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 bg-background z-50 flex flex-col"
    >
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-3 safe-top flex items-center gap-3">
        <button onClick={onBack} className="p-1"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="font-bold text-base">Détail du kongossa</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm mb-4">
          {isHot && (
            <div className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground text-xs font-bold px-2 py-1 rounded-full mb-2">
              <Flame className="w-3 h-3" /> Kongossa chaud!
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-foreground">{message.author}</span>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{message.distance < 100 ? "Tout près" : `${message.distance}m`}</span>
              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{timeAgo(message.timestamp)}</span>
            </div>
          </div>
          <p className="text-foreground text-base leading-relaxed mb-3">{message.text}</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onLike(message.id)} className={`flex items-center gap-1 font-semibold ${liked ? "text-primary" : "text-muted-foreground"}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? "fill-current" : ""}`} /> {message.likes}
            </button>
            <button onClick={() => onDislike(message.id)} className={`flex items-center gap-1 font-semibold ${disliked ? "text-destructive" : "text-muted-foreground"}`}>
              <ThumbsDown className={`w-4 h-4 ${disliked ? "fill-current" : ""}`} /> {message.dislikes}
            </button>
            <button onClick={() => onReport(message.id)} className="text-muted-foreground/50 hover:text-destructive ml-auto">
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Comments */}
        <h3 className="font-bold text-sm text-muted-foreground mb-3">
          Commentaires ({message.comments.length})
        </h3>
        {message.comments.length === 0 && (
          <p className="text-muted-foreground text-sm text-center py-6">Sois le premier à commenter! 💬</p>
        )}
        {message.comments.map((c) => (
          <div key={c.id} className="bg-card rounded-xl p-3 mb-2 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-xs text-foreground">{c.author}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(c.timestamp)}</span>
            </div>
            <p className="text-foreground text-sm">{c.text}</p>
          </div>
        ))}
      </div>

      {/* Comment input */}
      <div className="bg-card border-t border-border p-3 safe-bottom flex items-center gap-2">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Ajouter un commentaire..."
          className="flex-1 bg-background rounded-full px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === "Enter" && handleComment()}
        />
        <button
          onClick={handleComment}
          disabled={!comment.trim()}
          className="bg-primary text-primary-foreground p-2.5 rounded-full disabled:opacity-40 active:scale-95 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
