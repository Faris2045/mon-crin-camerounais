import { useState, useEffect, useCallback } from "react";

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
  distance: number; // in meters
  reported: boolean;
  lat: number;
  lng: number;
}

export interface KongossaComment {
  id: string;
  text: string;
  author: string;
  authorId: string;
  timestamp: number;
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

// Simulated messages for demo
function generateDemoMessages(userLat: number, userLng: number): KongossaMessage[] {
  const now = Date.now();
  const messages: KongossaMessage[] = [
    {
      id: "1", text: "Le taxi vient d'augmenter le prix à 300 FCFA au lieu de 200! C'est trop cher 😤", author: "Passager 12", authorId: "demo1",
      timestamp: now - 300000, expiresAt: now + 82800000, likes: 24, likedBy: ["demo2", "demo3"], comments: [
        { id: "c1", text: "Même chose ici à Bonamoussadi!", author: "Voisin 5", authorId: "demo2", timestamp: now - 200000 },
        { id: "c2", text: "Il faut se plaindre au syndicat", author: "Sage 8", authorId: "demo3", timestamp: now - 100000 },
      ], distance: 120, reported: false, lat: userLat + 0.001, lng: userLng + 0.001,
    },
    {
      id: "2", text: "Qui connaît un bon restaurant ndolè pas loin d'ici? J'ai trop faim 🍽️", author: "Curieux 7", authorId: "demo4",
      timestamp: now - 600000, expiresAt: now + 82400000, likes: 8, likedBy: [], comments: [
        { id: "c3", text: "Essaie Chez Maman Jeanne, c'est le meilleur!", author: "Explorateur 3", authorId: "demo5", timestamp: now - 500000 },
      ], distance: 350, reported: false, lat: userLat - 0.002, lng: userLng + 0.003,
    },
    {
      id: "3", text: "🔥 ALERTE: Embouteillage monstre au rond-point Deido! Évitez la zone si possible", author: "Observateur 22", authorId: "demo6",
      timestamp: now - 120000, expiresAt: now + 83000000, likes: 45, likedBy: ["demo1", "demo2", "demo4"], comments: [
        { id: "c4", text: "Merci pour l'info! Je vais passer par Akwa", author: "Flâneur 9", authorId: "demo7", timestamp: now - 60000 },
        { id: "c5", text: "C'est à cause d'un accident apparemment", author: "Bavard 14", authorId: "demo8", timestamp: now - 30000 },
        { id: "c6", text: "Ça fait 1h que je suis bloqué ici 😩", author: "Passager 6", authorId: "demo9", timestamp: now - 10000 },
      ], distance: 80, reported: false, lat: userLat + 0.0005, lng: userLng - 0.001,
    },
    {
      id: "4", text: "Il y a une promo folle au supermarché Santa Lucia! Tout à -30% 🛒", author: "Bavard 3", authorId: "demo10",
      timestamp: now - 1800000, expiresAt: now + 81000000, likes: 15, likedBy: [], comments: [], distance: 500, reported: false, lat: userLat - 0.004, lng: userLng - 0.002,
    },
    {
      id: "5", text: "Quelqu'un sait où je peux charger mon téléphone ici à l'université? Toutes les prises sont prises 😅", author: "Rêveur 11", authorId: "demo11",
      timestamp: now - 900000, expiresAt: now + 82000000, likes: 6, likedBy: [], comments: [
        { id: "c7", text: "Va à la bibliothèque, 2ème étage", author: "Sage 2", authorId: "demo12", timestamp: now - 800000 },
      ], distance: 200, reported: false, lat: userLat + 0.002, lng: userLng + 0.002,
    },
    {
      id: "6", text: "Le match des Lions Indomptables ce soir! Qui regarde où? 🦁⚽", author: "Comique 5", authorId: "demo13",
      timestamp: now - 3600000, expiresAt: now + 79000000, likes: 32, likedBy: ["demo1"], comments: [
        { id: "c8", text: "Au bar Le Penalty à Bonabéri!", author: "Aventurier 7", authorId: "demo14", timestamp: now - 3000000 },
      ], distance: 750, reported: false, lat: userLat - 0.005, lng: userLng + 0.005,
    },
  ];
  return messages;
}

export function useKongossaStore() {
  const [user] = useState(getUserData);
  const [messages, setMessages] = useState<KongossaMessage[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(1000); // meters
  const [locationError, setLocationError] = useState(false);

  // Get location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      // Default to Douala
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

  // Load demo messages once location is available
  useEffect(() => {
    if (!userLocation) return;
    const stored = localStorage.getItem("kongossa_messages");
    if (stored) {
      const parsed: KongossaMessage[] = JSON.parse(stored);
      const valid = parsed.filter((m) => m.expiresAt > Date.now() && !m.reported);
      setMessages(valid);
      if (valid.length === 0) {
        const demo = generateDemoMessages(userLocation.lat, userLocation.lng);
        setMessages(demo);
        localStorage.setItem("kongossa_messages", JSON.stringify(demo));
      }
    } else {
      const demo = generateDemoMessages(userLocation.lat, userLocation.lng);
      setMessages(demo);
      localStorage.setItem("kongossa_messages", JSON.stringify(demo));
    }
  }, [userLocation]);

  const saveMessages = useCallback((msgs: KongossaMessage[]) => {
    setMessages(msgs);
    localStorage.setItem("kongossa_messages", JSON.stringify(msgs));
  }, []);

  const addMessage = useCallback((text: string) => {
    if (!userLocation) return;
    const msg: KongossaMessage = {
      id: Date.now().toString(),
      text,
      author: user.name,
      authorId: user.id,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      likes: 0,
      likedBy: [],
      comments: [],
      distance: 0,
      reported: false,
      lat: userLocation.lat,
      lng: userLocation.lng,
    };
    const updated = [msg, ...messages];
    saveMessages(updated);
  }, [messages, user, userLocation, saveMessages]);

  const toggleLike = useCallback((messageId: string) => {
    const updated = messages.map((m) => {
      if (m.id !== messageId) return m;
      const liked = m.likedBy.includes(user.id);
      return {
        ...m,
        likes: liked ? m.likes - 1 : m.likes + 1,
        likedBy: liked ? m.likedBy.filter((id) => id !== user.id) : [...m.likedBy, user.id],
      };
    });
    saveMessages(updated);
  }, [messages, user.id, saveMessages]);

  const addComment = useCallback((messageId: string, text: string) => {
    const comment: KongossaComment = {
      id: Date.now().toString(),
      text,
      author: user.name,
      authorId: user.id,
      timestamp: Date.now(),
    };
    const updated = messages.map((m) =>
      m.id === messageId ? { ...m, comments: [...m.comments, comment] } : m
    );
    saveMessages(updated);
  }, [messages, user, saveMessages]);

  const reportMessage = useCallback((messageId: string) => {
    const updated = messages.map((m) =>
      m.id === messageId ? { ...m, reported: true } : m
    );
    saveMessages(updated);
  }, [messages, saveMessages]);

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
  };
}
