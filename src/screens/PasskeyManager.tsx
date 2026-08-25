import { useState, useEffect } from "react";
import {
  listPasskeys,
  registerPasskey,
  renamePasskey,
  deletePasskey,
  logSecurityEvent,
} from "../lib/auth/security";
import { isPasskeySupported, getBiometricName } from "../lib/auth/platform";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { AlertIcon, CheckIcon, KeyIcon, PlusIcon, TrashIcon, EditIcon } from "../components/icons";

interface PasskeyInfo {
  id: string;
  friendly_name?: string;
  created_at?: string;
  last_used_at?: string | null;
}

export default function PasskeyManager({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [biometricName, setBiometricName] = useState("Passkey");
  const supported = isPasskeySupported();

  useEffect(() => {
    getBiometricName().then(setBiometricName);
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    setLoading(true);
    const { data, error: listError } = await listPasskeys();
    if (listError) setError(listError);
    else setPasskeys((data as PasskeyInfo[]) ?? []);
    setLoading(false);
  };

  const handleRegister = async () => {
    setRegistering(true);
    setError(null);
    setSuccess(null);
    const { error: regError } = await registerPasskey();
    setRegistering(false);
    if (regError) {
      setError(regError);
      haptic("warning");
      return;
    }
    haptic("success");
    setSuccess(t("security.passkey_success"));
    await logSecurityEvent("passkey_enrolled", true);
    await loadPasskeys();
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) return;
    const { error: renameError } = await renamePasskey(id, renameValue.trim());
    if (renameError) {
      setError(renameError);
      return;
    }
    setRenamingId(null);
    setRenameValue("");
    await loadPasskeys();
  };

  const handleDelete = async (id: string) => {
    if (passkeys.length <= 1) {
      setError(t("security.passkey_last_warning"));
      return;
    }
    if (!confirm(t("security.passkey_confirm_remove"))) return;

    const { error: delError } = await deletePasskey(id);
    if (delError) {
      setError(delError);
      return;
    }
    haptic("light");
    await logSecurityEvent("passkey_revoked", true);
    await loadPasskeys();
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div style={{ paddingTop: "var(--s4)" }}>
      <button className="bg-link mb16" onClick={onBack}>
        ← {t("security.back")}
      </button>

      <div style={{ textAlign: "center", marginBottom: "var(--s6)" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(91,64,52,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto var(--s4)",
        }}>
          <KeyIcon size={26} style={{ color: "var(--chocolate)" }} />
        </div>
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>
          {t("security.passkey_title")}
        </h1>
        <p className="muted" style={{ fontSize: "0.875rem", lineHeight: 1.5, maxWidth: 320, margin: "0 auto" }}>
          {t("security.passkey_desc")}
        </p>
      </div>

      {!supported && (
        <div className="busw mb16">
          <AlertIcon size={16} />
          <span>{t("security.passkey_unsupported")}</span>
        </div>
      )}

      {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}
      {success && (
        <div className="busw mb16" style={{ background: "rgba(90,110,84,0.06)", borderColor: "rgba(90,110,84,0.18)", color: "var(--success)" }}>
          <CheckIcon size={16} /><span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="col g8">
          {[0, 1].map((i) => <div key={i} className="sk" style={{ height: 72, borderRadius: "var(--r-md)" }} />)}
        </div>
      ) : passkeys.length === 0 ? (
        <div className="empty" style={{ padding: "var(--s6)" }}>
          <p className="muted" style={{ fontSize: "0.875rem" }}>{t("security.passkey_empty")}</p>
        </div>
      ) : (
        <div className="col g8 mb16">
          {passkeys.map((pk) => (
            <div key={pk.id} className="card" style={{ padding: "var(--s3)", borderRadius: "var(--r-md)" }}>
              {renamingId === pk.id ? (
                <div className="col g8">
                  <input
                    className="in"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder={t("security.passkey_name_ph")}
                    autoFocus
                  />
                  <div className="row g8">
                    <button className="btn bs blk" style={{ flex: 1 }} onClick={() => handleRename(pk.id)}>
                      {t("security.passkey_rename")}
                    </button>
                    <button className="bg-link" onClick={() => { setRenamingId(null); setRenameValue(""); }}>
                      {t("security.back")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rb">
                  <div className="f1">
                    <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: 2 }}>
                      {pk.friendly_name ?? "Passkey"}
                    </div>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {t("security.passkey_created")}: {formatDate(pk.created_at)}
                    </div>
                    <div className="muted" style={{ fontSize: "0.75rem" }}>
                      {t("security.passkey_last_used")}: {formatDate(pk.last_used_at)}
                    </div>
                  </div>
                  <div className="row g4">
                    <button className="hbtn" onClick={() => { setRenamingId(pk.id); setRenameValue(pk.friendly_name ?? ""); }} aria-label={t("security.passkey_rename")}>
                      <EditIcon size={16} />
                    </button>
                    <button className="hbtn" style={{ color: "var(--warning)" }} onClick={() => handleDelete(pk.id)} aria-label={t("security.passkey_remove")}>
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {supported && (
        <button className="btn bp blk mb8" disabled={registering} onClick={handleRegister}>
          <PlusIcon size={16} /> {registering ? "..." : passkeys.length === 0 ? t("security.passkey_setup") : t("security.passkey_add")}
        </button>
      )}

      <p className="muted tcenter" style={{ fontSize: "0.75rem", marginTop: "var(--s3)" }}>
        {biometricName}
      </p>
    </div>
  );
}
