/**
 * Secure-storage adapter — uses localStorage on web.
 * Designed to be replaced by expo-secure-store in a native build.
 */

export function getStored(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function setStored(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* */ }
}

export function removeStored(key: string): void {
  try { localStorage.removeItem(key); } catch { /* */ }
}
