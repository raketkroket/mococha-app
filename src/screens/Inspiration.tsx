import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useParty } from "../store/party";
import { supabase } from "../data/api";
import { HeartIcon, BuildIcon, SlidersIcon, XIcon, ImageIcon } from "../components/icons";
import { useI18n } from "../i18n";

const partyTypesEn = ["All", "Kids birthday", "Babyshower", "Wedding", "Birthday", "Corporate", "More"];
const partyTypesNl = ["Alle", "Kinderverjaardag", "Babyshower", "Bruiloft", "Verjaardag", "Bedrijfsfeest", "Meer"];
const colorFiltersEn = ["Neutral", "Pink", "Blue", "Green", "Gold", "Custom"];
const colorFiltersNl = ["Neutraal", "Roze", "Blauw", "Groen", "Goud", "Custom"];

const COLOR_MAP: Record<string, string[]> = {
  Neutral: ["#e8d5c4", "#c4a580", "#8b7e74", "#d4c5b0", "#a89a8c"],
  Pink: ["#f5c6d0", "#e89aaf", "#c46b82", "#f8e1e7", "#d4889a"],
  Blue: ["#a8c8e0", "#7fa8cc", "#5b8ab0", "#c5dcec", "#8ab4d6"],
  Green: ["#b8d4b0", "#8ab87f", "#6ba05a", "#c8e0c0", "#94c088"],
  Gold: ["#d4af37", "#c49a2a", "#b8860b", "#e8c84a", "#dab020"],
};

type MediaItem = {
  id: string;
  storage_path: string;
  alt_text: string | null;
  is_cover: boolean;
  thumbnail_path: string | null;
};

type InspirationPost = {
  id: string;
  title: string;
  description: string | null;
  color_tags: string[] | null;
  is_featured: boolean;
  party_type_id: string | null;
  inspiration_media: MediaItem[];
};

const STORAGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`
  : "";

function mediaUrl(m: MediaItem | undefined): string | null {
  if (!m) return null;
  const path = m.thumbnail_path || m.storage_path;
  if (!path) return null;
  return `${STORAGE_BASE}/inspiration-media/${path}`;
}

function matchColorFilter(colorTags: string[] | null, filter: string): boolean {
  if (!colorTags || colorTags.length === 0) return false;
  const palette = COLOR_MAP[filter];
  if (!palette) return true;
  return colorTags.some((tag) => {
    const lower = tag.toLowerCase();
    return palette.some((c) => lower === c.toLowerCase() || lower.includes(c.toLowerCase().replace("#", "")));
  });
}

export default function Inspiration() {
  const navigate = useNavigate();
  const party = useParty();
  const { t, lang } = useI18n();
  const [posts, setPosts] = useState<InspirationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [typeFilterIdx, setTypeFilterIdx] = useState(0);
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<InspirationPost | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const partyTypes = lang === "nl" ? partyTypesNl : partyTypesEn;
  const colorFilters = lang === "nl" ? colorFiltersNl : colorFiltersEn;

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("inspiration_posts")
      .select("*, inspiration_media(*)")
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts((data as InspirationPost[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = posts.filter((p) => {
    if (colorFilter && !matchColorFilter(p.color_tags, colorFilter)) return false;
    return true;
  });

  const savedItems = posts.filter((p) => saved.has(p.id));
  const toggleSave = (id: string) => setSaved((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const startFromImage = (_item: InspirationPost) => {
    party.setBuildMode("inspiration");
    navigate("/bouwen");
  };

  const coverFor = (post: InspirationPost): MediaItem | undefined => {
    return post.inspiration_media?.find((m) => m.is_cover) ?? post.inspiration_media?.[0];
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--s5)" }}>
        <h1 className="screen-title">{t("insp.title")}</h1>
        <p className="muted" style={{ marginTop: "var(--s1)", fontSize: "0.875rem" }}>{t("insp.subtitle")}</p>
      </div>

      <div className="hsc" style={{ marginBottom: "var(--s3)" }}>
        {partyTypes.map((pt, idx) => (
          <button key={pt} className={`chip ${typeFilterIdx === idx ? "active" : ""}`} onClick={() => setTypeFilterIdx(idx)}>{pt}</button>
        ))}
      </div>

      <div className="rb mb16">
        <button className="bg-link" style={{ display: "flex", alignItems: "center", gap: 6 }} onClick={() => setShowFilters(true)}>
          <SlidersIcon size={16} /> {t("insp.filters")}{colorFilter ? `: ${colorFilter}` : ""}
        </button>
        <span className="muted" style={{ fontSize: "0.78rem" }}>{t("insp.concepts_count", { count: filtered.length })}</span>
      </div>

      {loading ? (
        <div className="insp-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="insp-card" style={{ minHeight: 200 }}>
              <div className="insp-card-placeholder" style={{ minHeight: 200 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty" style={{ padding: "var(--s8) var(--s4)" }}>
          <div className="empty-monogram"><ImageIcon size={28} /></div>
          <h3>{lang === "nl" ? "Binnenkort meer inspiratie" : "More inspiration coming soon"}</h3>
          <p style={{ fontSize: "0.875rem" }}>
            {lang === "nl"
              ? "We werken aan nieuwe feestinspiratie voor jou. Kom later terug of begin je eigen feest samen te stellen."
              : "We're adding new party inspiration for you. Check back soon or start building your own party."}
          </p>
          <button className="btn bp blk" style={{ marginTop: "var(--s4)" }} onClick={() => navigate("/bouwen")}>
            <BuildIcon size={16} /> {lang === "nl" ? "Begin je feest" : "Start your party"}
          </button>
        </div>
      ) : (
        <div className="insp-grid">
          {filtered.map((item, i) => {
            const cover = coverFor(item);
            const url = mediaUrl(cover);
            return (
              <div key={item.id} className={`insp-card ${i === 0 ? "insp-feature" : ""}`} onClick={() => setSelected(item)}>
                {url ? (
                  <img src={url} alt={cover?.alt_text ?? item.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                ) : (
                  <div className={`insp-card-placeholder ${i === 0 ? "insp-card-feature" : ""}`}>
                    <div className="img-placeholder-mark">MOCOCHA</div>
                  </div>
                )}
                <div className="insp-card-overlay">
                  <div className="insp-card-title">{item.title}</div>
                  {item.description && <div className="insp-card-type" style={{ WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</div>}
                  {item.color_tags && item.color_tags.length > 0 && (
                    <div className="swatch-row">
                      {item.color_tags.slice(0, 5).map((c, ci) => <span key={ci} className="swatch" style={{ background: c, border: "1px solid rgba(255,255,255,0.3)" }} />)}
                    </div>
                  )}
                </div>
                <button className={`insp-save ${saved.has(item.id) ? "saved" : ""}`} onClick={(e) => { e.stopPropagation(); toggleSave(item.id); }} aria-label={t("insp.save_insp")}>
                  <HeartIcon size={15} fill={saved.has(item.id)} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {savedItems.length > 0 && (
        <div className="sec">
          <div className="section-label">{t("insp.saved_title")} · {savedItems.length}</div>
          <div className="insp-grid">
            {savedItems.map((item) => {
              const cover = coverFor(item);
              const url = mediaUrl(cover);
              return (
                <div key={item.id} className="insp-card" onClick={() => setSelected(item)}>
                  {url ? (
                    <img src={url} alt={cover?.alt_text ?? item.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
                  ) : (
                    <div className="insp-card-placeholder">
                      <div className="img-placeholder-mark">MOCOCHA</div>
                    </div>
                  )}
                  <div className="insp-card-overlay">
                    <div className="insp-card-title">{item.title}</div>
                  </div>
                  <button className="insp-save saved" onClick={(e) => { e.stopPropagation(); toggleSave(item.id); }} aria-label={t("insp.remove_insp")}>
                    <HeartIcon size={15} fill={true} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showFilters && (
        <>
          <div className="sback" onClick={() => setShowFilters(false)} />
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="shandle" />
            <div className="rb mb16">
              <h2 className="screen-title" style={{ fontSize: "1.25rem" }}>{t("insp.filters")}</h2>
              <button className="hbtn" onClick={() => setShowFilters(false)} aria-label={t("insp.close")}><XIcon size={18} /></button>
            </div>
            <div className="section-label">{t("insp.color_palette")}</div>
            <div className="row g8" style={{ flexWrap: "wrap", marginBottom: "var(--s4)" }}>
              {colorFilters.map((c) => (
                <button key={c} className={`chip ${colorFilter === c ? "active" : ""}`} onClick={() => setColorFilter(colorFilter === c ? null : c)}>{c}</button>
              ))}
            </div>
            <button className="btn bp blk" onClick={() => setShowFilters(false)}>{t("insp.close")}</button>
          </div>
        </>
      )}

      {selected && (
        <>
          <div className="sback" onClick={() => setSelected(null)} />
          <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="shandle" />
            <button className="hbtn" style={{ position: "absolute", top: 12, right: 12, zIndex: 2 }} onClick={() => setSelected(null)} aria-label={t("insp.close")}><XIcon size={18} /></button>
            {(() => {
              const cover = coverFor(selected);
              const url = mediaUrl(cover);
              return (
                <div style={{ aspectRatio: "16/10", borderRadius: "var(--r-md)", overflow: "hidden", marginBottom: "var(--s4)" }}>
                  {url ? (
                    <img src={url} alt={cover?.alt_text ?? selected.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="img-placeholder" style={{ width: "100%", height: "100%" }}>
                      <div className="img-placeholder-mark">MOCOCHA</div>
                    </div>
                  )}
                </div>
              );
            })()}
            <h2 className="editorial-title" style={{ fontSize: "1.5rem", marginBottom: "var(--s1)" }}>{selected.title}</h2>
            {selected.description && <p className="muted mb16" style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{selected.description}</p>}
            {selected.color_tags && selected.color_tags.length > 0 && (
              <div className="row g12 mb24">
                <span className="muted" style={{ fontSize: "0.8125rem" }}>{t("insp.color_palette")}</span>
                <div className="row g4">{selected.color_tags.map((c) => <span key={c} className="swatch-lg" style={{ background: c }} />)}</div>
              </div>
            )}
            {selected.inspiration_media && selected.inspiration_media.length > 1 && (
              <div className="gal" style={{ marginBottom: "var(--s4)" }}>
                {selected.inspiration_media.filter((m) => !m.is_cover).map((m) => {
                  const u = mediaUrl(m);
                  return u ? (
                    <div key={m.id} className="gal-item">
                      <img src={u} alt={m.alt_text ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ) : null;
                })}
              </div>
            )}
            <div className="col g8">
              <button className="btn bp blk" onClick={() => startFromImage(selected)}><BuildIcon size={16} /> {t("insp.build_style")}</button>
              <button className="btn bs blk" onClick={() => { toggleSave(selected.id); setSelected(null); }}><HeartIcon size={16} fill={saved.has(selected.id)} /> {saved.has(selected.id) ? t("insp.remove_insp") : t("insp.save_insp")}</button>
              <button className="link tcenter" onClick={() => setSelected(null)}>{t("insp.close")}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
