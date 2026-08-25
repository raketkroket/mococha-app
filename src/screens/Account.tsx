import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth";
import { useProfile } from "../store/profile";
import { supabase } from "../data/api";
import { getAppSettings, getInstagramUrl } from "../data/settings";
import {
  MailIcon, MapPinIcon, ChevronRight, CheckIcon, SettingsIcon,
  BellIcon, HeartIcon, BuildIcon, PackageIcon, SparklesIcon,
  ShareIcon, CreditCard, ShieldIcon, UserIcon,
} from "../components/icons";
import type { AppSettings } from "../data/settings";
import { haptic } from "../lib/adapters/haptics";
import { useI18n } from "../i18n";

export default function Account() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const profile = useProfile();
  const { t } = useI18n();
  const [settings, setSettings] = useState<AppSettings>({ instagram_url: getInstagramUrl(), contact_email: "info@mococha.nl", terms_url: "/info/algemene-voorwaarden", privacy_url: "/info/privacy", app_version: "1.0.0", company_city: "Almere, Nederland" });
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => { getAppSettings().then(setSettings); }, []);
  useEffect(() => {
    if (user && supabase) {
      supabase.from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("unread_by_user", true)
        .then(({ count }) => setUnreadCount(count ?? 0));
    }
  }, [user]);

  if (!user) {
    return (
      <div>
        <div className="eyebrow mb8">{t("account.your_mococha")}</div>
        <h1 className="editorial-title" style={{ fontSize: "2rem", marginBottom: "var(--s3)" }}>{t("account.party_one_place")}</h1>
        <p className="muted" style={{ fontSize: "0.9375rem", marginBottom: "var(--s6)", lineHeight: 1.5 }}>{t("account.login_desc")}</p>
        <button className="btn bp blk mb8" onClick={() => { haptic("light"); navigate("/account/inloggen"); }}>{t("account.login_register")}</button>
        <button className="bg-link blk tcenter" onClick={() => navigate("/")}>{t("account.continue_guest")}</button>

        <div className="section-label">{t("account.benefits")}</div>
        <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
          <BenefitRow icon={SparklesIcon} label={t("account.save_concepts")} desc={t("account.save_concepts_desc")} />
          <BenefitRow icon={CreditCard} label={t("account.view_quotes")} desc={t("account.view_quotes_desc")} />
          <BenefitRow icon={BellIcon} label={t("account.receive_updates")} desc={t("account.receive_updates_desc")} />
        </div>

        <div className="section-label">{t("account.support")}</div>
        <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
          <MenuRow icon={MailIcon} label={t("account.contact_mococha")} onClick={() => navigate("/account/contact")} />
          <ExternalLinkRow icon={ShareIcon} label={t("account.instagram")} href={settings.instagram_url} externalHint={t("account.instagram_hint")} />
        </div>
      </div>
    );
  }

  const p = profile.profile;
  const initials = (p?.full_name || user.email || "?")
    .split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <div style={{ marginBottom: "var(--s6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)", marginBottom: "var(--s3)" }}>
          <Avatar url={p?.avatar_url ?? null} initials={initials} />
          <div className="f1">
            <h1 className="screen-title" style={{ fontSize: "1.5rem" }}>
              {p?.full_name || t("account.welcome")}
            </h1>
            <div className="muted" style={{ fontSize: "0.8125rem" }}>{user.email ?? ""}</div>
            {p?.email_verified && <span className="badge badge-approved" style={{ marginTop: 4 }}><CheckIcon size={10} /> {t("account.verified")}</span>}
          </div>
        </div>
        <button className="bg-link" onClick={() => navigate("/account/profiel")}>{t("account.edit_profile")}</button>
      </div>

      <div className="section-label">{t("account.my_party")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <MenuRow icon={SparklesIcon} label={t("account.my_concepts")} onClick={() => navigate("/concepten")} />
        <MenuRow icon={PackageIcon} label={t("account.quotes")} onClick={() => navigate("/quotes")} />
        <MenuRow icon={MailIcon} label={t("account.messages")} badge={unreadCount > 0 ? unreadCount : undefined} onClick={() => navigate("/account/berichten")} />
        <MenuRow icon={BellIcon} label={t("account.notifications")} onClick={() => navigate("/account/meldingen")} />
      </div>

      <div className="section-label">{t("account.account_section")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <MenuRow icon={UserIcon} label={t("account.personal_data")} onClick={() => navigate("/account/profiel")} />
        <MenuRow icon={MapPinIcon} label={t("account.addresses")} onClick={() => navigate("/account/adressen")} />
        <MenuRow icon={ShieldIcon} label={t("account.security")} onClick={() => navigate("/account/beveiliging")} />
      </div>

      <div className="section-label">{t("account.preferences")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <MenuRow icon={SettingsIcon} label={t("account.settings")} onClick={() => navigate("/account/instellingen")} />
        <MenuRow icon={HeartIcon} label={t("account.inspiration")} onClick={() => navigate("/inspiratie")} />
        <MenuRow icon={ShieldIcon} label={t("account.privacy")} onClick={() => navigate("/account/privacy")} />
      </div>

      <div className="section-label">{t("account.help")}</div>
      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <MenuRow icon={MailIcon} label={t("account.contact_mococha")} onClick={() => navigate("/account/contact")} />
        <ExternalLinkRow icon={ShareIcon} label={t("account.instagram")} href={settings.instagram_url} externalHint={t("account.instagram_hint")} />
        <MenuRow icon={SettingsIcon} label={t("account.terms")} onClick={() => navigate(settings.terms_url)} />
        <MenuRow icon={SettingsIcon} label={t("account.privacy_policy")} onClick={() => navigate(settings.privacy_url)} />
        <div className="info-row">
          <div className="info-row-icon"><BuildIcon size={20} /></div>
          <div className="info-row-text">{t("account.app_version", { version: settings.app_version })}</div>
        </div>
      </div>

      <hr className="div" style={{ marginTop: "var(--s8)" }} />
      <button className="btn bo blk mb8" onClick={async () => { await signOut(); profile.clear(); navigate("/"); }}>
        {t("account.logout")}
      </button>
    </div>
  );
}

function BenefitRow({ icon: Icon, label, desc }: { icon: typeof MailIcon; label: string; desc: string }) {
  return (
    <div className="info-row">
      <div className="info-row-icon"><Icon size={20} /></div>
      <div className="f1">
        <div className="info-row-text">{label}</div>
        <div className="muted" style={{ fontSize: "0.78rem", marginTop: 1 }}>{desc}</div>
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label, onClick, badge }: { icon: typeof MailIcon; label: string; onClick: () => void; badge?: number }) {
  return (
    <button className="info-row" onClick={() => { haptic("light"); onClick(); }}>
      <div className="info-row-icon"><Icon size={20} /></div>
      <div className="f1"><div className="info-row-text">{label}</div></div>
      {badge !== undefined && badge > 0 && <span className="unread-badge">{badge}</span>}
      <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
    </button>
  );
}

function ExternalLinkRow({ icon: Icon, label, href, externalHint }: { icon: typeof MailIcon; label: string; href: string; externalHint?: string }) {
  const open = () => { haptic("light"); window.open(href, "_blank", "noopener,noreferrer"); };
  return (
    <button className="info-row" onClick={open}>
      <div className="info-row-icon"><Icon size={20} /></div>
      <div className="f1">
        <div className="info-row-text">{label}</div>
        {externalHint && <div className="muted" style={{ fontSize: "0.78rem" }}>{externalHint}</div>}
      </div>
      <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
    </button>
  );
}

function Avatar({ url, initials }: { url: string | null; initials: string }) {
  const [imgUrl, setImgUrl] = useState(url);
  const [errored, setErrored] = useState(false);
  useEffect(() => { setImgUrl(url); setErrored(false); }, [url]);
  if (imgUrl && !errored) {
    return <img src={imgUrl} alt="Avatar" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} onError={() => setErrored(true)} />;
  }
  return (
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--soft-surface)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "1rem", fontWeight: 500, color: "var(--mococha-brown)" }}>
      {initials}
    </div>
  );
}
