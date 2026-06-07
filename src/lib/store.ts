import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAreaName, getAreaById, type Area } from "@/components/AreaSelector";

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

export interface KongossaAlert {
  id: string;
  authorId: string;
  authorName: string;
  message: string | null;
  lat: number;
  lng: number;
  status: string;
  timestamp: number;
  distance: number;
}

export interface UserData {
  id: string;
  name: string;
  areaId: string;
  areaTimestamp: number;
  fullName: string;
  phone: string;
}

function generateUserId(): string {
  return "user_" + Math.random().toString(36).substr(2, 9);
}

function getUserData(): UserData {
  const stored = localStorage.getItem("kongossa_user");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed.areaId) {
      parsed.areaId = "public";
      parsed.areaTimestamp = Date.now();
    }
    if (parsed.fullName === undefined) parsed.fullName = "";
    if (parsed.phone === undefined) parsed.phone = "";
    localStorage.setItem("kongossa_user", JSON.stringify(parsed));
    return parsed;
  }
  const data: UserData = {
    id: generateUserId(),
    name: getAreaName("public"),
    areaId: "public",
    areaTimestamp: Date.now(),
    fullName: "",
    phone: "",
  };
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

const AREA_PROMPT_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function useKongossaStore() {
  const [user, setUser] = useState(getUserData);
  const [messages, setMessages] = useState<KongossaMessage[]>([]);
  const [alerts, setAlerts] = useState<KongossaAlert[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(1000);
  const [locationError, setLocationError] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [permission, setPermission] = useState<"granted" | "denied" | "prompt" | "unsupported">("prompt");
  const [loading, setLoading] = useState(true);
  const bestAccuracyRef = useRef<number>(Infinity);
  const watchIdRef = useRef<number | null>(null);
  const [showAreaPrompt, setShowAreaPrompt] = useState(false);
  const [needsInitialArea, setNeedsInitialArea] = useState(false);
  const locationRef = useRef(userLocation);
  locationRef.current = userLocation;

  const needsIdentity = !user.fullName || !user.phone;

  // Check if user needs initial area selection (only after identity is set)
  useEffect(() => {
    const stored = localStorage.getItem("kongossa_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!parsed.areaId || parsed.areaId === "public") {
        setNeedsInitialArea(true);
      }
    } else {
      setNeedsInitialArea(true);
    }
  }, []);

  // Auto-prompt area change every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastChange = Date.now() - user.areaTimestamp;
      if (timeSinceLastChange >= AREA_PROMPT_INTERVAL) {
        setShowAreaPrompt(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user.areaTimestamp]);

  // Save the user's real identity (for police tracing) — stored privately
  const saveIdentity = useCallback(async (fullName: string, phone: string) => {
    const updated = { ...user, fullName, phone };
    setUser(updated);
    localStorage.setItem("kongossa_user", JSON.stringify(updated));
    const { error } = await supabase.from("identity_traces").insert({
      author_id: user.id,
      full_name: fullName,
      phone,
    });
    if (error) console.error("Error saving identity:", error);
  }, [user]);

  const changeArea = useCallback((area: Area) => {
    const newName = getAreaName(area.id);
    const updated = { ...user, name: newName, areaId: area.id, areaTimestamp: Date.now() };
    setUser(updated);
    localStorage.setItem("kongossa_user", JSON.stringify(updated));
    setShowAreaPrompt(false);
    setNeedsInitialArea(false);
  }, [user]);

  const dismissAreaPrompt = useCallback(() => {
    const updated = { ...user, areaTimestamp: Date.now() };
    setUser(updated);
    localStorage.setItem("kongossa_user", JSON.stringify(updated));
    setShowAreaPrompt(false);
  }, [user]);

  // Start watching the GPS position — keeps the most accurate fix available
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      setLocationError(true);
      setUserLocation((prev) => prev ?? { lat: 4.0511, lng: 9.7679 });
      return;
    }
    // Avoid stacking multiple watchers
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    bestAccuracyRef.current = Infinity;
    setLocating(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy ?? Infinity;
        setPermission("granted");
        setLocationError(false);
        setAccuracy(Math.round(acc));
        // Stop the "in progress" indicator once we have a usable fix
        if (acc <= 50) setLocating(false);
        // Keep the most accurate reading; replace only when a fix is at least as precise
        if (acc <= bestAccuracyRef.current + 1) {
          bestAccuracyRef.current = acc;
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
        }
        setLocating(false);
        setLocationError(true);
        setUserLocation((prev) => prev ?? { lat: 4.0511, lng: 9.7679 });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }, []);

  // Explicitly (re)request location — used by the "activer la localisation" button
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setPermission("unsupported");
      setLocationError(true);
      return;
    }
    setLocationError(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission("granted");
        setLocationError(false);
        setAccuracy(Math.round(pos.coords.accuracy ?? 0));
        bestAccuracyRef.current = pos.coords.accuracy ?? Infinity;
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        startWatching();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission("denied");
        setLocating(false);
        setLocationError(true);
        setUserLocation((prev) => prev ?? { lat: 4.0511, lng: 9.7679 });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
  }, [startWatching]);

  // Track permission state when the Permissions API is available
  useEffect(() => {
    if (!("permissions" in navigator) || !navigator.permissions?.query) return;
    let permStatus: PermissionStatus | null = null;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((status) => {
        permStatus = status;
        setPermission(status.state as "granted" | "denied" | "prompt");
        status.onchange = () => {
          setPermission(status.state as "granted" | "denied" | "prompt");
          if (status.state === "granted") startWatching();
        };
      })
      .catch(() => {});
    return () => {
      if (permStatus) permStatus.onchange = null;
    };
  }, [startWatching]);

  // Get location — watch continuously so urgency alerts have a fresh position
  useEffect(() => {
    startWatching();
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [startWatching]);

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

  // Fetch active SOS alerts
  const fetchAlerts = useCallback(async () => {
    if (!locationRef.current) return;
    const loc = locationRef.current;
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (error || !data) {
      console.error("Error fetching alerts:", error);
      return;
    }
    setAlerts(
      data.map((a) => ({
        id: a.id,
        authorId: a.author_id,
        authorName: a.author_name,
        message: a.message,
        lat: a.lat,
        lng: a.lng,
        status: a.status,
        timestamp: new Date(a.created_at).getTime(),
        distance: calculateDistance(loc.lat, loc.lng, a.lat, a.lng),
      }))
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    fetchMessages();
    fetchAlerts();
  }, [userLocation, fetchMessages, fetchAlerts]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userLocation) return;

    const channel = supabase
      .channel("kongossa-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => fetchAlerts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userLocation, fetchMessages, fetchAlerts]);

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

  // Trigger an emergency SOS alert at the current location
  const sendAlert = useCallback(async (message: string) => {
    if (!userLocation) return false;
    const { error } = await supabase.from("alerts").insert({
      author_id: user.id,
      author_name: user.name,
      message: message || null,
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
    if (error) {
      console.error("Error sending alert:", error);
      return false;
    }
    return true;
  }, [user, userLocation]);

  const resolveAlert = useCallback(async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", alertId);
    if (error) console.error("Error resolving alert:", error);
  }, []);

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

  // A post becomes a trend once it reaches 10 likes OR 10 comments
  const TREND_THRESHOLD = 10;
  const engagement = (m: KongossaMessage) => m.likes + m.comments.length * 2;
  const isTrending = (m: KongossaMessage) =>
    m.likes >= TREND_THRESHOLD || m.comments.length >= TREND_THRESHOLD;

  const activeMessages = messages.filter((m) => m.expiresAt > Date.now() && !m.reported);

  // ACCUEIL: strictly within the user's detection radius (proximity is the core promise)
  const feedMessages = activeMessages
    .filter((m) => m.distance <= radius)
    .sort((a, b) => b.timestamp - a.timestamp);

  // TENDANCES: popular posts surface beyond the radius, ranked by engagement
  const hotMessages = [...activeMessages]
    .filter((m) => isTrending(m))
    .sort((a, b) => engagement(b) - engagement(a));

  const myMessages = activeMessages.filter((m) => m.authorId === user.id);
  const stats = {
    posts: myMessages.length,
    likesReceived: myMessages.reduce((sum, m) => sum + m.likes, 0),
    commentsReceived: myMessages.reduce((sum, m) => sum + m.comments.length, 0),
  };

  // Alerts sorted by proximity — urgency overrides the radius (everyone sees them)
  const sortedAlerts = [...alerts].sort((a, b) => a.distance - b.distance);
  const myActiveAlert = sortedAlerts.find((a) => a.authorId === user.id);

  return {
    user,
    needsIdentity,
    saveIdentity,
    messages: feedMessages,
    hotMessages,
    myMessages,
    stats,
    alerts: sortedAlerts,
    myActiveAlert,
    sendAlert,
    resolveAlert,
    userLocation,
    locationError,
    accuracy,
    locating,
    permission,
    requestLocation,
    radius,
    setRadius,
    addMessage,
    toggleLike,
    addComment,
    reportMessage,
    loading,
    showAreaPrompt,
    needsInitialArea,
    changeArea,
    dismissAreaPrompt,
  };
}
