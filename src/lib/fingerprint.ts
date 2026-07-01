import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cached: string | null = null;

/**
 * Open-source hardware/browser fingerprint (FingerprintJS OSS).
 * Runs in the web view on Android/iOS (Capacitor) and on the web.
 * The resulting stable id is stored with the user's identity for fraud control.
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem("kongossa_fp");
    if (stored) {
      cached = stored;
      return stored;
    }
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    cached = result.visitorId;
    localStorage.setItem("kongossa_fp", cached);
    return cached;
  } catch {
    // Fallback: generate a persistent random id so signup never breaks
    const fallback =
      localStorage.getItem("kongossa_fp") ||
      "fp_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("kongossa_fp", fallback);
    cached = fallback;
    return fallback;
  }
}
