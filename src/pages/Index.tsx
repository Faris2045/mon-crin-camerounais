import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Megaphone, MapPin } from "lucide-react";
import { useKongossaStore } from "@/lib/store";
import MessageCard from "@/components/MessageCard";
import ComposeSheet from "@/components/ComposeSheet";
import MessageDetail from "@/components/MessageDetail";
import BottomNav, { Tab } from "@/components/BottomNav";
import ProfilePanel from "@/components/ProfilePanel";
import AreaSelector from "@/components/AreaSelector";
import SplashScreen from "@/components/SplashScreen";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const store = useKongossaStore();
  const [tab, setTab] = useState<Tab>("feed");
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [manualAreaOpen, setManualAreaOpen] = useState(false);
  const { toast } = useToast();

  const selectedMessage = store.messages.find((m) => m.id === selectedId) ||
    store.hotMessages.find((m) => m.id === selectedId);

  const handleReport = (id: string) => {
    store.reportMessage(id);
    toast({ title: "Signalé", description: "Ce message a été signalé. Merci!" });
  };

  const currentMessages = tab === "hot" ? store.hotMessages : store.messages;

  const areaOpen = store.needsInitialArea || store.showAreaPrompt || manualAreaOpen;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* Area Selector */}
      <AreaSelector
        open={areaOpen && !showSplash}
        onSelect={(area) => {
          store.changeArea(area);
          setManualAreaOpen(false);
          const areaLabel = area.label;
          toast({ title: `${area.emoji} ${areaLabel}`, description: `Tu es maintenant "${store.user.name}"` });
        }}
        currentAreaId={store.user.areaId}
      />

      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 safe-top sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black tracking-widest">KONGOSSA</h1>
          <div className="flex items-center gap-1 text-primary-foreground/80 text-xs">
            <MapPin className="w-3 h-3" />
            <span className="font-semibold">{store.radius >= 1000 ? `${store.radius / 1000}km` : `${store.radius}m`}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 pt-4">
        {tab === "settings" ? (
          <SettingsPanel
            username={store.user.name}
            areaId={store.user.areaId}
            radius={store.radius}
            onRadiusChange={store.setRadius}
            onChangeArea={() => setManualAreaOpen(true)}
            locationError={store.locationError}
          />
        ) : (
          <>
            {tab === "feed" && (
              <p className="text-xs text-muted-foreground mb-3 font-semibold">
                📍 {currentMessages.length} kongossa{currentMessages.length !== 1 ? "s" : ""} autour de toi
              </p>
            )}
            {tab === "hot" && (
              <p className="text-xs text-muted-foreground mb-3 font-semibold">
                🔥 Les kongossas les plus chauds du moment
              </p>
            )}

            {currentMessages.length === 0 ? (
              <div className="text-center py-16">
                <Megaphone className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-semibold">
                  {tab === "hot" ? "Pas encore de kongossa chaud 🔥" : "Aucun kongossa autour de toi"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {tab === "hot" ? "Les messages populaires apparaîtront ici" : "Sois le premier à lancer un kongossa!"}
                </p>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  userId={store.user.id}
                  onLike={store.toggleLike}
                  onTap={setSelectedId}
                  onReport={handleReport}
                  isHot={msg.likes >= 10}
                />
              ))
            )}
          </>
        )}
      </main>

      {/* FAB */}
      {tab !== "settings" && (
        <button
          onClick={() => setComposeOpen(true)}
          className="fixed bottom-20 right-4 bg-secondary text-secondary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30 active:scale-90 transition-transform"
        >
          <Megaphone className="w-6 h-6" />
        </button>
      )}

      <BottomNav active={tab} onChange={setTab} />

      <ComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSubmit={store.addMessage}
      />

      <AnimatePresence>
        {selectedMessage && (
          <MessageDetail
            message={selectedMessage}
            userId={store.user.id}
            onBack={() => setSelectedId(null)}
            onLike={store.toggleLike}
            onComment={store.addComment}
            onReport={handleReport}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
