import { useState, useEffect } from "react";
import { isOnline, onConnectivityChange } from "../lib/adapters/connectivity";
import { useI18n } from "../i18n";

export function OfflineIndicator() {
  const [online, setOnline] = useState(isOnline());
  const { t } = useI18n();

  useEffect(() => {
    const unsub = onConnectivityChange((v) => setOnline(v));
    return unsub;
  }, []);

  if (online) return null;

  return (
    <div className="offline-bar" role="status" aria-live="polite">
      {t("offline.message")}
    </div>
  );
}
