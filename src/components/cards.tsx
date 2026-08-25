import { AlertIcon } from "./icons";
import { useI18n } from "../i18n";

export function BusWarning({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="busw" role="alert" style={compact ? { padding: "10px 12px", fontSize: "0.78rem" } : undefined}>
      <AlertIcon size={16} />
      <span>{t("bus.warning")}</span>
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="eicon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
