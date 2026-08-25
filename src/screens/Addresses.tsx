import { useState, useEffect } from "react";
import { useAuth } from "../store/auth";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { supabase } from "../data/api";
import { MapPinIcon, PlusIcon, AlertIcon } from "../components/icons";

interface Address {
  id: string;
  street: string;
  postal_code: string;
  city: string;
  label: string | null;
}

export default function Addresses() {
  const user = useAuth((s) => s.user);
  const { t } = useI18n();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!supabase || !user) { setLoading(false); return; }
    const { data, error } = await supabase.from("addresses").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  return (
    <div>
      <h1 className="screen-title mb8">{t("addresses.title")}</h1>
      <p className="muted mb24" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{t("addresses.desc")}</p>

      {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}

      {!adding && (
        <>
          {loading ? (
            <div className="muted mb16">{t("addresses.loading")}</div>
          ) : addresses.length === 0 ? (
            <div className="empty">
              <div className="empty-monogram">M</div>
              <h3>{t("addresses.empty")}</h3>
              <p>{t("addresses.empty_desc")}</p>
            </div>
          ) : (
            <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
              {addresses.map((a) => (
                <div className="info-row" key={a.id}>
                  <div className="info-row-icon"><MapPinIcon size={20} /></div>
                  <div className="f1">
                    {a.label && <div className="muted" style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{a.label}</div>}
                    <div className="info-row-text">{a.street}</div>
                    <div className="muted" style={{ fontSize: "0.78rem" }}>{a.postal_code} {a.city}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn bp blk mt24" onClick={() => { setAdding(true); haptic("light"); }}>
            <PlusIcon size={16} /> {t("addresses.add")}
          </button>
        </>
      )}

      {adding && <AddressForm onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} userId={user?.id ?? ""} />}
    </div>
  );
}

function AddressForm({ onCancel, onSaved, userId }: { onCancel: () => void; onSaved: () => void; userId: string }) {
  const { t } = useI18n();
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = street.trim() && postalCode.trim() && city.trim();

  const handleSave = async () => {
    if (!supabase) { setError("Geen verbinding"); return; }
    setSaving(true); setError(null);
    const { error } = await supabase.from("addresses").insert({
      user_id: userId, street: street.trim(), postal_code: postalCode.trim(), city: city.trim(), label: label.trim() || null,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    haptic("success");
    onSaved();
  };

  return (
    <div className="cstep">
      <div className="rb mb16">
        <button className="bg-link" onClick={onCancel}>{t("addresses.cancel")}</button>
      </div>
      <div className="field">
        <label>{t("addresses.street")}</label>
        <input className="in" value={street} onChange={(e) => setStreet(e.target.value)} placeholder={t("addresses.street_ph")} />
      </div>
      <div className="field">
        <label>{t("addresses.postal_code")}</label>
        <input className="in" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={t("addresses.postal_code_ph")} />
      </div>
      <div className="field">
        <label>{t("addresses.city")}</label>
        <input className="in" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("addresses.city_ph")} />
      </div>
      <div className="field">
        <label>{t("addresses.label")}</label>
        <input className="in" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("addresses.label_ph")} />
      </div>

      {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}

      <button className="btn bp blk" disabled={!canSave || saving} onClick={handleSave}>
        {saving ? t("addresses.saving") : t("addresses.save")}
      </button>
    </div>
  );
}
