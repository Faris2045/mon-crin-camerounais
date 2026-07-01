import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAreaName, getAreaById, type Area } from "@/components/AreaSelector";
import { getDeviceFingerprint } from "@/lib/fingerprint";
import { initNotifications, notify } from "@/lib/notifications";

export interface KongossaComment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  timestamp: number;
  replyToId?: string | null;
  replyToAuthor?: string | null;
  replyToText?: string | null;
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
  dislikes: number;
  dislikedBy: string[];
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
  confirmations: number;
  confirmedBy: string[];
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

  // Notification tracking (avoid notifying on first load)
  const notifInitRef = useRef(false);
  const commentCountRef = useRef<Record<string, number>>({});
  const knownAlertsRef = useRef<Set<string>>(new Set());
  const userRef = useRef(user);
  userRef.current = user;

  // Ask for notification permission once
  useEffect(() => {
    initNotifications();
  }, []);

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

  // Save the user's real identity. The private trace (name/phone/fingerprint)
  // is registered server-side by the verify-otp function (anti-duplicate check),
  // so here we only persist it locally on the device.
  const saveIdentity = useCallback(async (fullName: string, phone: string) => {
    const fingerprint = await getDeviceFingerprint().catch(() => undefined);
    const updated = { ...user, fullName, phone };
    setUser(updated);
    localStorage.setItem("kongossa_user", JSON.stringify(updated));
    if (fingerprint) localStorage.setItem("kongossa_fp", fingerprint);
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

  // Disconnect: clears the local identity so the user can start over
  const logout = useCallback(() => {
    localStorage.removeItem("kongossa_user");
    window.location.reload();
  }, []);



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
        replyToId: (c as { reply_to_id?: string }).reply_to_id ?? null,
        replyToAuthor: (c as { reply_to_author?: string }).reply_to_author ?? null,
        replyToText: (c as { reply_to_text?: string }).reply_to_text ?? null,
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
      dislikes: (m as { dislikes?: number }).dislikes ?? 0,
      dislikedBy: (m as { disliked_by?: string[] }).disliked_by || [],
      comments: commentsByMsg[m.id] || [],
      distance: calculateDistance(loc.lat, loc.lng, m.lat, m.lng),
      reported: m.reported,
      lat: m.lat,
      lng: m.lng,
    }));

    // Notify on new comments / replies (not on first load)
    const me = userRef.current.id;
    if (notifInitRef.current) {
      mapped.forEach((m) => {
        const prev = commentCountRef.current[m.id];
        const cur = m.comments.length;
        if (prev !== undefined && cur > prev) {
          const fresh = m.comments.slice(prev);
          fresh.forEach((c) => {
            if (c.authorId === me) return; // ignore my own comments
            if (c.replyToId && m.comments.find((x) => x.id === c.replyToId)?.authorId === me) {
              notify("💬 Nouvelle réponse", `${c.author} a répondu à votre commentaire`);
            } else if (m.authorId === me) {
              notify("💬 Nouveau commentaire", `${c.author} a commenté votre kongossa`);
            }
          });
        }
      });
    }
    mapped.forEach((m) => { commentCountRef.current[m.id] = m.comments.length; });
    notifInitRef.current = true;

    setMessages(mapped);
    setLoading(false);
  }, []);

  // Fetch active SOS alerts
  const fetchAlerts = useCallback(async () => {
    if (!locationRef.current) return;
    const loc = locationRef.current;
    // Alerts only live for 24h to avoid saturating the notifications tab
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("status", "active")
      .gt("created_at", since)
      .order("created_at", { ascending: false });
    if (error || !data) {
      console.error("Error fetching alerts:", error);
      return;
    }
    const mappedAlerts: KongossaAlert[] = data.map((a) => ({
      id: a.id,
      authorId: a.author_id,
      authorName: a.author_name,
      message: a.message,
      lat: a.lat,
      lng: a.lng,
      status: a.status,
      timestamp: new Date(a.created_at).getTime(),
      distance: calculateDistance(loc.lat, loc.lng, a.lat, a.lng),
      confirmations: (a as { confirmations?: number }).confirmations ?? 0,
      confirmedBy: (a as { confirmed_by?: string[] }).confirmed_by || [],
    }));

    // Notify on new nearby alerts (not on first load)
    const me = userRef.current.id;
    mappedAlerts.forEach((a) => {
      if (
        knownAlertsRef.current.size > 0 &&
        !knownAlertsRef.current.has(a.id) &&
        a.authorId !== me &&
        a.distance <= 5000
      ) {
        notify("🚨 Alerte SOS à proximité", a.message || "Une personne près de vous a besoin d'aide", true);
      }
    });
    knownAlertsRef.current = new Set(mappedAlerts.map((a) => a.id));

    setAlerts(mappedAlerts);
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
    // Liking removes any existing dislike from the same user
    const newDislikedBy = msg.dislikedBy.filter((id) => id !== user.id);
    const { error } = await supabase.from("messages").update({
      likes: newLikedBy.length,
      liked_by: newLikedBy,
      dislikes: newDislikedBy.length,
      disliked_by: newDislikedBy,
    }).eq("id", messageId);
    if (error) console.error("Error toggling like:", error);
  }, [messages, user.id]);

  const toggleDislike = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const disliked = msg.dislikedBy.includes(user.id);
    const newDislikedBy = disliked ? msg.dislikedBy.filter((id) => id !== user.id) : [...msg.dislikedBy, user.id];
    // Disliking removes any existing like from the same user
    const newLikedBy = msg.likedBy.filter((id) => id !== user.id);
    const { error } = await supabase.from("messages").update({
      likes: newLikedBy.length,
      liked_by: newLikedBy,
      dislikes: newDislikedBy.length,
      disliked_by: newDislikedBy,
    }).eq("id", messageId);
    if (error) console.error("Error toggling dislike:", error);
  }, [messages, user.id]);

  const addComment = useCallback(async (
    messageId: string,
    text: string,
    replyTo?: { id: string; author: string; text: string } | null,
  ) => {
    const { error } = await supabase.from("comments").insert({
      message_id: messageId,
      text,
      author: user.name,
      author_id: user.id,
      reply_to_id: replyTo?.id ?? null,
      reply_to_author: replyTo?.author ?? null,
      reply_to_text: replyTo ? replyTo.text.slice(0, 140) : null,
    });
    if (error) console.error("Error adding comment:", error);
  }, [user]);

  // Community confirmation: mark an alert as still relevant / witnessed
  const confirmAlert = useCallback(async (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert || alert.confirmedBy.includes(user.id) || alert.authorId === user.id) return;
    const newConfirmedBy = [...alert.confirmedBy, user.id];
    const { error } = await supabase
      .from("alerts")
      .update({ confirmations: newConfirmedBy.length, confirmed_by: newConfirmedBy })
      .eq("id", alertId);
    if (error) console.error("Error confirming alert:", error);
  }, [alerts, user.id]);

  const reportMessage = useCallback(async (messageId: string) => {
    const { error } = await supabase.from("messages").update({ reported: true }).eq("id", messageId);
    if (error) console.error("Error reporting:", error);
  }, []);

  // A post becomes a trend once it reaches 50 likes OR 50 comments
  const TREND_THRESHOLD = 50;
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

  // Alerts relevance system — to avoid saturation, we only surface PERTINENT alerts:
  //  • last 24h only
  //  • kept if nearby (within 3× radius) OR confirmed by the community (≥ 2 people)
  //  • ranked by a relevance score (confirmations > proximity > freshness)
  //  • capped to the 25 most relevant so the tab never overflows
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RELEVANCE_MIN_CONFIRM = 2;
  const alertScore = (a: KongossaAlert) => {
    const ageH = (Date.now() - a.timestamp) / 3_600_000;
    const distKm = a.distance / 1000;
    return a.confirmations * 10 - distKm * 0.5 - ageH * 0.3;
  };
  const sortedAlerts = [...alerts]
    .filter((a) => Date.now() - a.timestamp < DAY_MS)
    .filter(
      (a) =>
        a.authorId === user.id ||
        a.distance <= radius * 3 ||
        a.confirmations >= RELEVANCE_MIN_CONFIRM,
    )
    .sort((a, b) => alertScore(b) - alertScore(a))
    .slice(0, 25);
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
    confirmAlert,
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
    toggleDislike,
    addComment,
    reportMessage,
    loading,
    showAreaPrompt,
    needsInitialArea,
    changeArea,
    dismissAreaPrompt,
    logout,
    isTrending,
  };
}
