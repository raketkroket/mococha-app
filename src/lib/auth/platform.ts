/**
 * Platform Authentication Adapter
 *
 * Abstracts WebAuthn/passkey operations so the app can later support
 * native iOS passkeys and Android Credential Manager without changing
 * the security UI code.
 *
 * Current platform: Web (WebAuthn via Supabase experimental passkey support)
 * Future platforms: iOS (nl.mococha.app), Android (Credential Manager)
 *
 * TOTP remains Supabase-based on all platforms — no platform adapter needed.
 */

export type AuthPlatform = "web" | "ios" | "android";

export function getAuthPlatform(): AuthPlatform {
  if (typeof window === "undefined") return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua) && typeof (window as unknown as Record<string, unknown>).webkit !== "undefined") {
    return "ios";
  }
  if (/android/.test(ua) && typeof (window as unknown as { mocochaAuth?: unknown }).mocochaAuth !== "undefined") {
    return "android";
  }
  return "web";
}

export function isPasskeySupported(): boolean {
  if (typeof window === "undefined") return false;
  const platform = getAuthPlatform();
  if (platform !== "web") return true;
  return typeof window.PublicKeyCredential !== "undefined";
}

export function getRpId(): string {
  return import.meta.env.VITE_WEBAUTHN_RP_ID ?? window.location.hostname;
}

export function getRpName(): string {
  return import.meta.env.VITE_WEBAUTHN_RP_NAME ?? "MOCOCHA";
}

export function getAppUrl(): string {
  return import.meta.env.VITE_APP_URL ?? window.location.origin;
}

/**
 * Returns the user-facing device biometric name if available.
 * e.g. "Face ID" on iOS, "Touch ID" on Mac, "Device PIN" on Android.
 * Falls back to "Passkey" when the specific method cannot be determined.
 */
export async function getBiometricName(): Promise<string> {
  if (typeof window === "undefined") return "Passkey";
  if (typeof window.PublicKeyCredential === "undefined") return "Passkey";

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad/.test(ua)) return "Face ID";
  if (/mac/.test(ua)) return "Touch ID";
  if (/android/.test(ua)) return "Apparaat-pin";
  if (/win/.test(ua)) return "Windows Hello";
  return "Passkey";
}
