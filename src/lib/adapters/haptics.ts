/**
 * Haptics adapter — uses navigator.vibrate on web.
 * Designed to be replaced by expo-haptics in a native build.
 */

type HapticPattern = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 15,
  heavy: 25,
  selection: 8,
  success: [10, 40, 20],
  warning: [20, 60, 20],
  error: [30, 80, 30, 80, 30],
};

let enabled = true;

export function setHapticsEnabled(v: boolean) { enabled = v; }
export function isHapticsEnabled() { return enabled; }

export function haptic(pattern: HapticPattern = "light"): void {
  if (!enabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(patterns[pattern]); } catch { /* unsupported */ }
  }
}

export { haptic as default };
