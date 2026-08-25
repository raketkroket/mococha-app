import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../store/auth";
import { getAppSettings, getInstagramUrl } from "../data/settings";
import {
  MailIcon, MapPinIcon, ChevronRight, CheckIcon, AlertIcon, ShareIcon,
} from "../components/icons";
import type { AppSettings } from "../data/settings";
import { haptic } from "../lib/adapters/haptics";
import { useParty } from "../store/party";
import { useI18n } from "../i18n";

export default function Contact() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const party = useParty();
  const { t, lang } = useI18n();
  const [params] = useSearchParams();
  const conceptId = params.get("concept");
  const [settings, setSettings] = useState<AppSettings>({ instagram_url: getInstagramUrl(), contact_email: "info@mococha.nl", terms_url: "/info/algemene-voorwaarden", privacy_url: "/info/privacy", app_version: "1.0.0", company_city: "Almere, Nederland" });

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyEmail, setReplyEmail] = useState(user?.email ?? "");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(true);

  useEffect(() => { getAppSettings().then(setSettings); }, []);
  useEffect(() => {
    if (conceptId) setSubject(t("contact.concept_subject"));
  }, [conceptId, t]);

  const concept = conceptId ? party.concepts.find((c) => c.id === conceptId) : null;

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim() || !replyEmail.trim()) {
      setError(t("contact.fill_fields"));
      return;
    }
    if (!consent) {
      setError(t("contact.consent_required"));
      return;
    }
    setSending(true); setError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const resp = await fetch(`${supabaseUrl}/functions/v1/contact-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
        body: JSON.stringify({
          user_id: user?.id ?? null,
          reply_email: replyEmail.trim(),
          subject: subject.trim(),
          message: message.trim(),
          concept_id: conceptId || null,
          concept_name: concept?.name || null,
          category: conceptId ? "concept_question" : "general",
          lang,
        }),
      });

      const result = await resp.json();

      if (!resp.ok) {
        setError(result.error || t("contact.error"));
        setSending(false);
        return;
      }

      if (!result.email_configured) {
        setEmailConfigured(false);
      }

      setSent(true);
      haptic("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("contact.error"));
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: "center", paddingTop: "var(--s8)" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(90,110,84,0.10)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--s4)" }}>
          <CheckIcon size={26} style={{ color: "var(--success)" }} />
        </div>
        <h1 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s2)" }}>{t("contact.sent_title")}</h1>
        <p className="muted" style={{ fontSize: "0.875rem", maxWidth: 300, margin: "0 auto var(--s4)", lineHeight: 1.5 }}>
          {t("contact.sent_body")}
        </p>
        {!emailConfigured && (
          <div className="busw mb16" style={{ maxWidth: 320, margin: "0 auto var(--s4)" }}>
            <AlertIcon size={16} />
            <span>{t("contact.email_not_configured")}</span>
          </div>
        )}
        <div className="col g8">
          {user && <button className="btn bp blk" style={{ maxWidth: 280, margin: "0 auto" }} onClick={() => navigate("/account/berichten")}>{t("contact.to_messages")}</button>}
          <button className="bg-link blk tcenter" onClick={() => { setSent(false); setSubject(""); setMessage(""); }}>{t("contact.send_another")}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="screen-title mb8">{t("contact.title")}</h1>
      <p className="muted mb24" style={{ fontSize: "0.875rem" }}>{t("contact.subtitle")}</p>

      <div style={{ borderTop: "0.5px solid var(--hairline)" }}>
        <button className="info-row" onClick={() => { window.open(settings.instagram_url, "_blank", "noopener,noreferrer"); haptic("light"); }}>
          <div className="info-row-icon"><ShareIcon size={20} /></div>
          <div className="f1">
            <div className="info-row-text">{t("contact.instagram")}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{t("contact.instagram_hint")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
        <button className="info-row" onClick={() => { window.location.href = `mailto:${settings.contact_email}`; }}>
          <div className="info-row-icon"><MailIcon size={20} /></div>
          <div className="f1">
            <div className="info-row-text">{t("contact.email")}</div>
            <div className="muted" style={{ fontSize: "0.78rem" }}>{settings.contact_email}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
        </button>
        <div className="info-row">
          <div className="info-row-icon"><MapPinIcon size={20} /></div>
          <div className="info-row-text">{settings.company_city}</div>
        </div>
      </div>

      <div className="section-label">{t("contact.send_message")}</div>

      {concept && (
        <div className="busw mb16" style={{ fontSize: "0.8125rem" }}>
          <span>{t("contact.linked_concept", { name: concept.name ? ` "${concept.name}"` : "" })}</span>
        </div>
      )}

      <div className="field">
        <label>{t("contact.subject")}</label>
        <input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("contact.subject_ph")} />
      </div>
      <div className="field">
        <label>{t("contact.message")}</label>
        <textarea className="ta" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("contact.message_ph")} style={{ minHeight: 120 }} />
      </div>
      <div className="field">
        <label>{t("contact.reply_email")}</label>
        <input className="in" type="email" value={replyEmail} onChange={(e) => setReplyEmail(e.target.value)} placeholder={t("contact.reply_email_ph")} />
      </div>
      <div className="field">
        <label style={{ display: "flex", alignItems: "flex-start", gap: "var(--s2)", cursor: "pointer" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, minHeight: 16, minWidth: 16 }} />
          <span style={{ fontSize: "0.8125rem", color: "var(--taupe)", lineHeight: 1.5 }}>
            {t("contact.consent")}
          </span>
        </label>
      </div>

      {error && <div className="busw mb16"><AlertIcon size={16} /><span>{error}</span></div>}

      <button className="btn bp blk" disabled={sending} onClick={handleSubmit}>
        {sending ? t("contact.sending") : t("contact.send")}
      </button>
    </div>
  );
}
