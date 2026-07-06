import { Capacitor } from "@capacitor/core";

/**
 * Optional fingerprint unlock.
 * - On web (preview) it is skipped.
 * - On device it only prompts when a sensor is actually available.
 * - It NEVER blocks or crashes the flow: any error just resolves as "skipped"
 *   so the user is never locked out.
 */
export async function optionalFingerprint(): Promise<"ok" | "skipped" | "failed"> {
  if (!Capacitor.isNativePlatform()) return "skipped";

  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");

    let available = false;
    try {
      const res = await NativeBiometric.isAvailable({ useFallback: true });
      available = !!res?.isAvailable;
    } catch (_) {
      available = false;
    }
    if (!available) return "skipped";

    try {
      await NativeBiometric.verifyIdentity({
        reason: "Confirme ton identité",
        title: "KONGOSSA",
        subtitle: "Déverrouillage",
        description: "Pose ton doigt sur le capteur.",
        useFallback: true,
      });
      return "ok";
    } catch (_) {
      // User cancelled or verification failed — optional, so don't lock out.
      return "failed";
    }
  } catch (_) {
    // Plugin missing / not integrated — skip silently.
    return "skipped";
  }
}
