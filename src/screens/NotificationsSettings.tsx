import { useState, useEffect } from "react";
import { useAuth } from "../store/auth";
import { useProfile, type ProfileData } from "../store/profile";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { supabase } from "../data/api";
import { CheckIcon, AlertIcon } from "../components/icons";

type NotifPrefs = NonNullable<ProfileData["notification_preferences"]>;

const DEFAULT_PREFS: NotifPrefs = {
  push: true, email: true, marketing: false,
  concept_updates: true, payment_updates: true, event_reminders: true,
};

export default function NotificationsSettings() {
  const user = useAuth((s) => s.user);
  const profile = useProfile();
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [initial, setInitial] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const p = profile.profile?.notification_preferences;
    if (p) {
      const merged = { ...DEFAULT_PREFS, ...p };
      setPrefs(merged); setInitial(merged); setLoaded(true);
    } else if (profile.profile) {
      setLoaded(true);
    }
  }, [profile.profile]);

  const changed = JSON.stringify(prefs) !== JSON.stringify(initial);

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs((s) => ({ ...s, [key]: !s[key] }));
    haptic("light");
  };

  const handleSave = async () => {
    if (!supabase || !user) { setError("Niet ingelogd"); return; }
    setSaving(true); setError(null);
    const { error } = await supabase.from("profiles").update({ notification_preferences: prefs }).eq("id", user.id);
    setSaving(false);
    if (error) { setError(error.message); return; }
    setInitial(prefs); setSaved(true); haptic("success");
    setTimeout(() => setSaved(false), 1600);
  };

  if (!loaded) return (
    <div>
      <h1 className="screen-title mb24">{t("notifsettings.title")}</h1>
    </div>
  );

  return (
    <div>
      <h1 className="screen-title mb8">{t("notifsettings.title")}</h1>
      <p className="muted mb24" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{t("notifsettings.desc")}</p>

      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <ToggleRow label={t("notifsettings.push")} desc={t("notifsettings.push_desc")} value={prefs.push} onChange={() => toggle("push")} />
        <ToggleRow label={t("notifsettings.email")} desc={t("notifsettings.email_desc")} value={prefs.email} onChange={() => toggle("email")} />
        <ToggleRow label={t("notifsettings.concept_updates")} desc={t("notifsettings.concept_updates_desc")} value={prefs.concept_updates} onChange={() => toggle("concept_updates")} />
        <ToggleRow label={t("notifsettings.event_reminders")} desc={t("notifsettings.event_reminders_desc")} value={prefs.event_reminders} onChange={() => toggle("event_reminders")} />
        <ToggleRow label={t("notifsettings.payment_updates")} desc={t("notifsettings.payment_updates_desc")} value={prefs.payment_updates} onChange={() => toggle("payment_updates")} />
        <ToggleRow label={t("notifsettings.marketing")} desc={t("notifsettings.marketing_desc")} value={prefs.marketing} onChange={() => toggle("marketing")} />
      </div>

      {error && <div className="busw mb16 mt16"><AlertIcon size={16} /><span>{error}</span></div>}

      <button className="btn bp blk mt24" disabled={!changed || saving} onClick={handleSave}>
        {saved ? <><CheckIcon size={16} /> {t("notifsettings.saved")}</> : saving ? t("notifsettings.saving") : t("notifsettings.save")}
      </button>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="info-row" style={{ cursor: "pointer" }} onClick={onChange}>
      <div className="f1">
        <div className="info-row-text">{label}</div>
        <div className="muted" style={{ fontSize: "0.78rem" }}>{desc}</div>
      </div>
      <div style={{
        width: 44, height: 26, borderRadius: 13, background: value ? "var(--chocolate)" : "var(--fine-border)",
        position: "relative", transition: "background var(--dur)", flexShrink: 0,
      }}>
        <div style={{
          position: "absolute", top: 3, left: value ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%", background: "var(--pure-white)",
          transition: "left var(--dur) var(--ease)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </div>
    </div>
  );
}
