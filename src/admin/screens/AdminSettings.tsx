import { useState, useEffect } from "react";
import { supabase } from "../../data/api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import { CheckIcon } from "../../components/icons";

const SETTING_KEYS = [
  "instagram_url",
  "contact_email",
  "terms_url",
  "privacy_url",
  "company_city",
  "app_version",
];

const SETTING_LABELS: Record<string, { nl: string; en: string }> = {
  instagram_url: { nl: "Instagram URL", en: "Instagram URL" },
  contact_email: { nl: "Contact e-mail", en: "Contact email" },
  terms_url: { nl: "Algemene voorwaarden URL", en: "Terms URL" },
  privacy_url: { nl: "Privacy URL", en: "Privacy URL" },
  company_city: { nl: "Stad", en: "City" },
  app_version: { nl: "App versie", en: "App version" },
};

export default function AdminSettings() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("app_settings")
      .select("key, value")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data as Array<{ key: string; value: unknown }>)?.forEach((row) => {
          map[row.key] = String(row.value ?? "");
        });
        setSettings(map);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    setSaved(false);

    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from("app_settings")
        .update({ value: JSON.stringify(value) })
        .eq("key", key);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  return (
    <div className="admin-settings">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.nav.settings")}</h1>
      </div>

      <div className="admin-settings-section">
        <h2 className="admin-settings-section-title">{t("admin.more.business")}</h2>
        {SETTING_KEYS.map((key) => (
          <div key={key} className="admin-field">
            <label className="admin-field-label">
              {SETTING_LABELS[key]?.[language] ?? key}
            </label>
            <input
              className="admin-input"
              value={settings[key] ?? ""}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div className="admin-form-actions admin-sticky-bar">
        {saved && (
          <span className="admin-saved-indicator">
            <CheckIcon size={16} />
            {t("admin.settings.saved")}
          </span>
        )}
        <button
          className="admin-btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t("admin.common.loading") : t("admin.settings.save")}
        </button>
      </div>
    </div>
  );
}
