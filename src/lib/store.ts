import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KongossaComment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  timestamp: number;
}

export interface KongossaMessage {
  id: string;
  text: string;
  author: string;
  authorId: string;
  timestamp: number;
  expiresAt: number;
  likes: number;
  likedBy: string[];
  comments: KongossaComment[];
  distance: number;
  reported: boolean;
  lat: number;
  lng: number;
}

const ANONYMOUS_NAMES = [
  "Passager", "Voisin proche", "Curieux", "Bavard", "Observateur",
  "Mystérieux", "Flâneur", "Inconnu", "Ami secret", "Explorateur",
  "Aventurier", "Rêveur", "Philosophe", "Comique", "Sage",
];

function generateUserId(): string {
  return "user_" + Math.random().toString(36).substr(2, 9);
}

function generateUsername(): string {
  const name = ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${name} ${num}`;
}

function getUserData(): { id: string; name: string } {
  const stored = localStorage.getItem("kongossa_user");
  if (stored) return JSON.parse(stored);
  const data = { id: generateUserId(), name: generateUsername() };
  localStorage.setItem("kongossa_user", JSON.stringify(data));
  return data;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useKongossaStore() {
  const [user] = useState(getUserData);
  const [messages, setMessages] = useState<KongossaMessage[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(1000);
  const [locationError, setLocationError] = useState(false);
  const [loading, setLoading] = useState(true);
  const locationRef = useRef(userLocation);
  locationRef.current = userLocation;

  // Get location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      setUserLocation({ lat: 4.0511, lng: 9.7679 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setLocationError(true);
        setUserLocation({ lat: 4.0511, lng: 9.7679 });
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Fetch messages from Supabase
  const fetchMessages = useCallback(async () => {
    if (!locationRef.current) return;
    const loc = locationRef.current;

    const { data: msgData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("reported", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (error || !msgData) {
      console.error("Error fetching messages:", error);
      setLoading(false);
      return;
    }

    // Fetch all comments
    const messageIds = msgData.map((m) => m.id);
    const { data: commentData } = messageIds.length > 0
      ? await supabase.from("comments").select("*").in("message_id", messageIds).order("created_at", { ascending: true })
      : { data: [] };

    const commentsByMsg: Record<string, KongossaComment[]> = {};
    (commentData || []).forEach((c) => {
      if (!commentsByMsg[c.message_id]) commentsByMsg[c.message_id] = [];
      commentsByMsg[c.message_id].push({
        id: c.id,
        text: c.text,
        author: c.author,
        authorId: c.author_id,
        timestamp: new Date(c.created_at).getTime(),
      });
    });

    const mapped: KongossaMessage[] = msgData.map((m) => ({
      id: m.id,
      text: m.text,
      author: m.author,
      authorId: m.author_id,
      timestamp: new Date(m.created_at).getTime(),
      expiresAt: new Date(m.expires_at).getTime(),
      likes: m.likes,
      likedBy: m.liked_by || [],
      comments: commentsByMsg[m.id] || [],
      distance: calculateDistance(loc.lat, loc.lng, m.lat, m.lng),
      reported: m.reported,
      lat: m.lat,
      lng: m.lng,
    }));

    setMessages(mapped);
    setLoading(false);
  }, []);

  // Load messages when location ready
  useEffect(() => {
    if (!userLocation) return;
    fetchMessages();
  }, [userLocation, fetchMessages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userLocation) return;

    const channel = supabase
      .channel("kongossa-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        fetchMessages();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, fetchMessages]);

  const addMessage = useCallback(async (text: string) => {
    if (!userLocation) return;
    const { error } = await supabase.from("messages").insert({
      text,
      author: user.name,
      author_id: user.id,
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
    if (error) console.error("Error adding message:", error);
  }, [user, userLocation]);

  const toggleLike = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const liked = msg.likedBy.includes(user.id);
    const newLikedBy = liked ? msg.likedBy.filter((id) => id !== user.id) : [...msg.likedBy, user.id];
    const { error } = await supabase.from("messages").update({
      likes: newLikedBy.length,
      liked_by: newLikedBy,
    }).eq("id", messageId);
    if (error) console.error("Error toggling like:", error);
  }, [messages, user.id]);

  const addComment = useCallback(async (messageId: string, text: string) => {
    const { error } = await supabase.from("comments").insert({
      message_id: messageId,
      text,
      author: user.name,
      author_id: user.id,
    });
    if (error) console.error("Error adding comment:", error);
  }, [user]);

  const reportMessage = useCallback(async (messageId: string) => {
    const { error } = await supabase.from("messages").update({ reported: true }).eq("id", messageId);
    if (error) console.error("Error reporting:", error);
  }, []);

  const feedMessages = messages
    .filter((m) => m.expiresAt > Date.now() && !m.reported && m.distance <= radius)
    .sort((a, b) => b.timestamp - a.timestamp);

  const hotMessages = [...feedMessages].sort((a, b) => b.likes - a.likes).filter((m) => m.likes >= 10);

  return {
    user,
    messages: feedMessages,
    hotMessages,
    userLocation,
    locationError,
    radius,
    setRadius,
    addMessage,
    toggleLike,
    addComment,
    reportMessage,
    loading,
  };
}
