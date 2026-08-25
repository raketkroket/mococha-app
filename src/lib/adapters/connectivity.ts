/**
 * Offline detection adapter.
 */

type OfflineCallback = (online: boolean) => void;
const listeners = new Set<OfflineCallback>();

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onConnectivityChange(cb: OfflineCallback): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { listeners.forEach((cb) => cb(true)); });
  window.addEventListener("offline", () => { listeners.forEach((cb) => cb(false)); });
}
