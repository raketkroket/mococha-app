import { useNavigate } from "react-router-dom";
import { useParty } from "../store/party";
import { useI18n } from "../i18n";
import { BuildIcon, InspireIcon, SparklesIcon, ChevronRight, MailIcon } from "../components/icons";
import { eur } from "../utils/format";

export default function Home() {
  const navigate = useNavigate();
  const party = useParty();
  const { t } = useI18n();
  const hasDraft = party.event.type || party.selections.length > 0;
  const recentConcepts = party.concepts.filter((c) => c.status !== "archived").slice(0, 2);

  return (
    <div>
      <section className="hero">
        <img src="/mococha-hero.webp" alt="MOCOCHA luxury party styling" className="hero-img"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&h=1200&q=80"; }} />
        <div className="hov">
          <div className="hov-eyebrow">{t("home.eyebrow")}</div>
          <h2>{t("home.hero_title")}</h2>
          <p>{t("home.hero_desc")}</p>
          <div className="hact">
            <button className="btn bp blk" onClick={() => navigate("/bouwen")}>{t("home.cta_build")}</button>
            <button className="bg-link" style={{ color: "rgba(255,255,255,0.82)" }} onClick={() => navigate("/inspiratie")}>{t("home.cta_inspire")}</button>
          </div>
        </div>
      </section>

      {hasDraft && (
        <section style={{ marginTop: "var(--s6)" }}>
          <div className="section-label">{t("home.draft_title")}</div>
          <button className="start-card" onClick={() => navigate("/bouwen")}>
            <div className="start-card-icon"><BuildIcon size={20} /></div>
            <div className="f1">
              <div className="start-card-title">{party.event?.type || t("home.draft_no_type")}</div>
              <div className="start-card-desc">{party.selections.length} {t("home.draft_parts")}</div>
            </div>
            <span className="badge badge-draft">{t("status.draft")}</span>
          </button>
        </section>
      )}

      <section className="sec">
        <div className="section-label">{t("home.get_started")}</div>
        <h2 className="screen-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s4)" }}>{t("home.how_start")}</h2>
        <div className="col g8">
          <button className="start-card" onClick={() => { party.setBuildMode("self"); party.clear(); navigate("/bouwen"); }}>
            <div className="start-card-icon"><BuildIcon size={20} /></div>
            <div className="f1">
              <div className="start-card-title">{t("home.self_title")}</div>
              <div className="start-card-desc">{t("home.self_desc")}</div>
            </div>
            <ChevronRight size={18} style={{ color: "var(--taupe-light)", flexShrink: 0 }} />
          </button>
          <button className="start-card" onClick={() => { party.setBuildMode("inspiration"); navigate("/inspiratie"); }}>
            <div className="start-card-icon"><InspireIcon size={20} /></div>
            <div className="f1">
              <div className="start-card-title">{t("home.insp_title")}</div>
              <div className="start-card-desc">{t("home.insp_desc")}</div>
            </div>
            <ChevronRight size={18} style={{ color: "var(--taupe-light)", flexShrink: 0 }} />
          </button>
          <button className="start-card" onClick={() => { party.setBuildMode("mococha-design"); navigate("/bouwen"); }}>
            <div className="start-card-icon"><SparklesIcon size={20} /></div>
            <div className="f1">
              <div className="start-card-title">{t("home.design_title")}</div>
              <div className="start-card-desc">{t("home.design_desc")}</div>
            </div>
            <ChevronRight size={18} style={{ color: "var(--taupe-light)", flexShrink: 0 }} />
          </button>
        </div>
      </section>

      {recentConcepts.length > 0 && (
        <section className="sec">
          <div className="shd">
            <h2 className="screen-title" style={{ fontSize: "1.25rem" }}>{t("concepts.title")}</h2>
            <button className="slink" onClick={() => navigate("/concepten")}>{t("home.view_all")}</button>
          </div>
          <div className="col g12">
            {recentConcepts.map((c) => (
              <button key={c.id} className="concept-card" style={{ border: "none", background: "transparent" }} onClick={() => navigate(`/concepten/${c.id}`)}>
                <div className="concept-card-top" style={{ padding: 0 }}>
                  <div className="concept-thumb"><BuildIcon size={22} /></div>
                  <div className="f1">
                    <div style={{ fontWeight: 500, fontSize: "0.9375rem", color: "var(--near-black)" }}>{c.name || c.event?.type || t("detail.untitled")}</div>
                    <div className="muted" style={{ fontSize: "0.78rem", marginTop: 1 }}>{c.event?.date || t("detail.no_date")}</div>
                    <div className="tbrown" style={{ fontSize: "0.875rem", fontWeight: 500, marginTop: 2 }}>{eur(c.breakdown.total_gross)}</div>
                  </div>
                  <ChevronRight size={18} style={{ color: "var(--taupe-light)", flexShrink: 0 }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="sec">
        <div className="shd">
          <h2 className="screen-title" style={{ fontSize: "1.25rem" }}>{t("home.inspiration_title")}</h2>
          <button className="slink" onClick={() => navigate("/inspiratie")}>{t("home.view_all")}</button>
        </div>
        <div className="insp-grid">
          {["Zachte droom", "Gold glam", "Cloud nine"].map((title, i) => (
            <button key={title} className={`insp-card ${i === 0 ? "insp-feature" : ""}`} onClick={() => navigate("/inspiratie")}>
              <div className={`insp-card-placeholder ${i === 0 ? "insp-card-feature" : ""}`}>
                <div className="img-placeholder-mark">MOCOCHA</div>
                <div style={{ color: "var(--taupe)", fontSize: "0.78rem" }}>{t("insp.image_pending")}</div>
              </div>
              <div className="insp-card-overlay">
                <div className="insp-card-title">{title}</div>
                <div className="insp-card-type">{t("step.event_type")}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="sec">
        <div className="section-label">{t("home.footer_contact")}</div>
        <button className="start-card" onClick={() => navigate("/contact")}>
          <div className="start-card-icon"><MailIcon size={20} /></div>
          <div className="f1">
            <div className="start-card-title">{t("account.contact_mococha")}</div>
            <div className="start-card-desc">{t("contact.subtitle")}</div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--taupe-light)", flexShrink: 0 }} />
        </button>
      </section>

      <footer style={{ textAlign: "center", paddingBottom: "var(--s4)", marginTop: "var(--s8)" }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: "1.1rem", fontWeight: 600, letterSpacing: "0.08em", color: "var(--chocolate)", marginBottom: 10 }}>MOCOCHA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8125rem" }}>
          <button className="bg-link" style={{ justifyContent: "center" }} onClick={() => navigate("/info/algemene-voorwaarden")}>{t("home.footer_terms")}</button>
          <button className="bg-link" style={{ justifyContent: "center" }} onClick={() => navigate("/contact")}>{t("home.footer_contact")}</button>
        </div>
        <p className="muted" style={{ fontSize: "0.7rem", marginTop: 14, color: "var(--taupe-light)" }}>{t("home.footer_rights", { year: new Date().getFullYear() })}</p>
      </footer>
    </div>
  );
}
