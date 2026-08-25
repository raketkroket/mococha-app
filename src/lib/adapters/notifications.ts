/**
 * Notification adapter — web fallback uses in-app notifications only.
 * Designed to be replaced by expo-notifications in a native build.
 */

export type NotificationPermission = "granted" | "denied" | "default" | "unsupported";

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  } catch {
    return "unsupported";
  }
}

export function getPermissionStatus(): NotificationPermission {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as NotificationPermission;
}

export async function showLocalNotification(title: string, body: string): Promise<void> {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch { /* */ }
  }
}
