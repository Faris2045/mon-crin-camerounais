// Local notifications + haptics that work on the phone (Capacitor) and degrade
// gracefully on the web. Used to alert the user of new comments/replies/alerts
// with a small vibration + sound, similar to WhatsApp.

let nativeReady = false;
let LocalNotifications: typeof import("@capacitor/local-notifications").LocalNotifications | null = null;
let Haptics: typeof import("@capacitor/haptics").Haptics | null = null;
let ImpactStyle: typeof import("@capacitor/haptics").ImpactStyle | null = null;

function isNative(): boolean {
  // @ts-expect-error Capacitor is injected at runtime on native builds
  return typeof window !== "undefined" && (window.Capacitor?.isNativePlatform?.() ?? false);
}

export async function initNotifications() {
  if (!isNative()) return;
  try {
    const ln = await import("@capacitor/local-notifications");
    const hp = await import("@capacitor/haptics");
    LocalNotifications = ln.LocalNotifications;
    Haptics = hp.Haptics;
    ImpactStyle = hp.ImpactStyle;
    await LocalNotifications.requestPermissions();
    nativeReady = true;
  } catch (e) {
    console.warn("Notifications init failed", e);
  }
}

export async function notify(title: string, body: string, urgent = false) {
  // Vibrate (native) or use the Vibration API on the web
  try {
    if (nativeReady && Haptics && ImpactStyle) {
      await Haptics.impact({ style: urgent ? ImpactStyle.Heavy : ImpactStyle.Medium });
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(urgent ? [120, 60, 120] : 80);
    }
  } catch { /* ignore */ }

  if (nativeReady && LocalNotifications) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      });
      return;
    } catch (e) {
      console.warn("notify failed", e);
    }
  }

  // Web fallback: browser notification if permitted
  try {
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((p) => {
          if (p === "granted") new Notification(title, { body });
        });
      }
    }
  } catch { /* ignore */ }
}
