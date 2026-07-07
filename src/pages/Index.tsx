import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Megaphone, MapPin, Siren } from "lucide-react";
import { useKongossaStore } from "@/lib/store";
import MessageCard from "@/components/MessageCard";
import ComposeSheet from "@/components/ComposeSheet";
import MessageDetail from "@/components/MessageDetail";
import BottomNav, { Tab } from "@/components/BottomNav";
import ProfilePanel from "@/components/ProfilePanel";
import AreaSelector from "@/components/AreaSelector";
import SplashScreen from "@/components/SplashScreen";
import IdentitySetup from "@/components/IdentitySetup";
import SosSheet from "@/components/SosSheet";
import AlertCenter from "@/components/AlertCenter";
import { useToast } from "@/hooks/use-toast";

export default function Index() {
  const store = useKongossaStore();
  const [tab, setTab] = useState<Tab>("feed");
  const [composeOpen, setComposeOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
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

  // Identity must be set before anything else, then area
  const showIdentity = store.needsIdentity && !showSplash;
  const areaOpen = !store.needsIdentity && (store.needsInitialArea || store.showAreaPrompt || manualAreaOpen);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* Identity creation (email + username + password) */}
      <IdentitySetup
        open={showIdentity}
        deviceUserId={store.user.id}
        onSubmit={(username, email) => {
          store.saveIdentity(username, email);
          toast({ title: "Bienvenue ✅", description: "Tu restes anonyme publiquement." });
        }}
      />

      {/* Area Selector */}
      <AreaSelector
        open={areaOpen && !showSplash}
        onSelect={(area) => {
          store.changeArea(area);
          setManualAreaOpen(false);
          toast({ title: `${area.emoji} ${area.label}`, description: `Tu es maintenant "${store.user.name}"` });
        }}
        currentAreaId={store.user.areaId}
      />

      {/* Header */}
      <header className="bg-primary text-primary-foreground px-4 py-3 safe-top sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black tracking-widest">KONGOSSA</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-primary-foreground/80 text-xs">
              <MapPin className="w-3 h-3" />
              <span className="font-semibold">{store.radius >= 1000 ? `${store.radius / 1000}km` : `${store.radius}m`}</span>
            </div>
            <button
              onClick={() => setSosOpen(true)}
              className="bg-destructive text-destructive-foreground font-black text-xs px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-90 transition-transform"
            >
              <Siren className="w-3.5 h-3.5" />
              SOS
            </button>
          </div>
        </div>
      </header>

      {/* Persistent nearby-alert banner */}
      {store.alerts.length > 0 && tab !== "alert" && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setTab("alert")}
          className="w-full bg-destructive/10 text-destructive px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold border-b border-destructive/20"
        >
          <Siren className="w-4 h-4 animate-pulse" />
          {store.alerts.length} alerte{store.alerts.length !== 1 ? "s" : ""} d'urgence — appuie pour voir
        </motion.button>
      )}

      {/* Content */}
      <main className="px-4 pt-4">
        {tab === "alert" ? (
          <AlertCenter alerts={store.alerts} myUserId={store.user.id} onResolve={store.resolveAlert} onConfirm={store.confirmAlert} />
        ) : tab === "settings" ? (
          <ProfilePanel
            username={store.user.name}
            areaId={store.user.areaId}
            radius={store.radius}
            stats={store.stats}
            myMessages={store.myMessages}
            onRadiusChange={store.setRadius}
            onChangeArea={() => setManualAreaOpen(true)}
            locationError={store.locationError}
            accuracy={store.accuracy}
            locating={store.locating}
            permission={store.permission}
            onRequestLocation={store.requestLocation}
            onLogout={store.logout}
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
                <p className="text-foreground font-extrabold uppercase tracking-wide">
                  {tab === "hot" ? "Les sujets populaires apparaîtront ici" : "Sois le premier à informer ta communauté"}
                </p>
                <p className="text-muted-foreground text-sm mt-1.5">
                  {tab === "hot"
                    ? "Les kongossas qui font réagir grimpent automatiquement ici"
                    : "Balance ton kongossa et fais vibrer ton quartier 📢"}
                </p>
              </div>
            ) : (
              currentMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  userId={store.user.id}
                  onLike={store.toggleLike}
                  onDislike={store.toggleDislike}
                  onTap={setSelectedId}
                  onReport={handleReport}
                  isHot={store.isTrending(msg)}
                />
              ))
            )}
          </>
        )}
      </main>

      {/* FAB */}
      {tab === "feed" || tab === "hot" ? (
        <button
          onClick={() => setComposeOpen(true)}
          className="fixed bottom-20 right-4 bg-secondary text-secondary-foreground w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30 active:scale-90 transition-transform"
        >
          <Megaphone className="w-6 h-6" />
        </button>
      ) : null}

      <BottomNav active={tab} onChange={setTab} alertCount={store.alerts.length} />

      <ComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSubmit={store.addMessage}
      />

      <SosSheet
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        onSend={store.sendAlert}
        locationError={store.locationError}
      />

      <AnimatePresence>
        {selectedMessage && (
          <MessageDetail
            message={selectedMessage}
            userId={store.user.id}
            onBack={() => setSelectedId(null)}
            onLike={store.toggleLike}
            onDislike={store.toggleDislike}
            onComment={store.addComment}
            onReport={handleReport}
            onReportUser={(authorId, authorName) => {
              store.reportUser(authorId, authorName, selectedMessage.id);
              toast({ title: "Compte signalé", description: "Merci, notre équipe va vérifier ce compte." });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
