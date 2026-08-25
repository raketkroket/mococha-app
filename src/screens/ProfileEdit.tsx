import { useState, useEffect } from "react";
import { useProfile } from "../store/profile";
import { useAuth } from "../store/auth";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { pickFromLibrary, takePhoto, compressImage } from "../lib/adapters/camera";
import { CheckIcon, AlertIcon, TrashIcon } from "../components/icons";

export default function ProfileEdit() {
  const profile = useProfile();
  const user = useAuth((s) => s.user);
  const { t } = useI18n();
  const p = profile.profile;

  const [fullName, setFullName] = useState(p?.full_name ?? "");
  const [phone, setPhone] = useState(p?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  useEffect(() => {
    if (p) { setFullName(p.full_name ?? ""); setPhone(p.phone ?? ""); }
  }, [p?.full_name, p?.phone]);

  const initialName = p?.full_name ?? "";
  const initialPhone = p?.phone ?? "";
  const changed = fullName !== initialName || phone !== initialPhone;

  const initials = (fullName || user?.email || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const handleSave = async () => {
    setSaving(true); setError(null);
    const { error } = await profile.update({ full_name: fullName, phone });
    setSaving(false);
    if (error) { setError(error); return; }
    setSaved(true); haptic("success");
    setTimeout(() => setSaved(false), 1600);
  };

  const handlePickImage = async (fromCamera: boolean) => {
    setShowAvatarMenu(false);
    const result = fromCamera ? await takePhoto() : await pickFromLibrary();
    if (!result) return;
    haptic("light");
    const blob = await compressImage(result.dataUrl, 512, 0.82);
    const { error } = await profile.uploadAvatar(blob, "jpeg");
    if (error) setError(error); else haptic("success");
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarMenu(false);
    const { error } = await profile.removeAvatar();
    if (error) setError(error); else haptic("medium");
  };

  return (
    <div>
      <h1 className="screen-title mb24">{t("profile.title")}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)", marginBottom: "var(--s5)" }}>
        <Avatar url={profile.profile?.avatar_url ?? null} initials={initials} />
        <div className="col g4">
          <button className="bg-link" onClick={() => setShowAvatarMenu(!showAvatarMenu)}>{t("profile.change_photo")}</button>
          {profile.avatarUploading && <div className="muted" style={{ fontSize: "0.75rem" }}>{profile.avatarUploadProgress}%</div>}
        </div>
      </div>

      {showAvatarMenu && (
        <div className="col g8 mb24" style={{ animation: "screenIn 0.2s var(--ease)" }}>
          <button className="btn bs blk" onClick={() => handlePickImage(true)}>{t("profile.take_photo")}</button>
          {profile.profile?.avatar_path && (
            <button className="bg-link" style={{ color: "var(--warning)" }} onClick={handleRemoveAvatar}><TrashIcon size={14} /> {t("profile.remove_photo")}</button>
          )}
        </div>
      )}

      <div className="field">
        <label>{t("profile.full_name")}</label>
        <input className="in" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("profile.full_name_ph")} />
      </div>
      <div className="field">
        <label>{t("profile.phone")}</label>
        <input className="in" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("profile.phone_ph")} />
      </div>
      <div className="field">
        <label>{t("profile.email")}</label>
        <input className="in" value={user?.email ?? p?.email ?? ""} readOnly style={{ color: "var(--taupe)" }} />
      </div>
      <div className="muted mb16" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
        {t("profile.email_note")}
      </div>

      {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}

      <button className="btn bp blk" disabled={!changed || saving} onClick={handleSave}>
        {saved ? <><CheckIcon size={16} /> {t("profile.saved")}</> : saving ? t("profile.saving") : t("profile.save")}
      </button>
    </div>
  );
}

function Avatar({ url, initials }: { url: string | null; initials: string }) {
  const [imgUrl, setImgUrl] = useState(url);
  const [errored, setErrored] = useState(false);
  useEffect(() => { setImgUrl(url); setErrored(false); }, [url]);
  if (imgUrl && !errored) {
    return <img src={imgUrl} alt="Profile avatar" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={() => setErrored(true)} />;
  }
  return (
    <div style={{
      width: 72, height: 72, borderRadius: "50%", background: "var(--soft-surface)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      fontSize: "1.25rem", fontWeight: 500, color: "var(--mococha-brown)",
    }}>
      {initials}
    </div>
  );
}
