/**
 * Share adapter — uses navigator.share on web, falls back to clipboard.
 * Designed to be replaced by expo-sharing in a native build.
 */

export async function shareContent(title: string, url?: string): Promise<void> {
  const shareData: ShareData = { title };
  if (url) shareData.url = url;
  if (typeof navigator !== "undefined" && "share" in navigator) {
    try { await navigator.share(shareData); return; } catch { /* cancelled */ }
  }
  if (url && typeof navigator !== "undefined" && navigator.clipboard) {
    try { await navigator.clipboard.writeText(url); } catch { /* */ }
  }
}
