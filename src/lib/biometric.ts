import { Capacitor } from "@capacitor/core";

/**
 * Native fingerprint / biometric verification.
 * On a real Android/iOS device it prompts the OS fingerprint dialog.
 * On the web (preview) it resolves as available so the flow can be tested.
 */
export async function verifyFingerprint(): Promise<{ ok: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    // Web / preview: no hardware sensor — allow the flow to continue.
    return { ok: true };
  }

  try {
    const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");

    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) {
      return { ok: false, error: "Aucun capteur d'empreinte disponible sur cet appareil." };
    }

    await NativeBiometric.verifyIdentity({
      reason: "Confirme ton identité",
      title: "KONGOSSA",
      subtitle: "Vérification par empreinte",
      description: "Pose ton doigt sur le capteur pour continuer.",
    });

    // verifyIdentity resolves on success, rejects on failure/cancel.
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Vérification par empreinte échouée ou annulée." };
  }
}
