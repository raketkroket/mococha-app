import { useState, useEffect, useRef } from "react";
import { adminApi } from "../api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { InspirationPost, InspirationMedia, AdminTheme } from "../types";
import {
  ImageIcon,
  PlusIcon,
  CheckIcon,
  StarIcon,
  PackageIcon,
  TrashIcon,
  UploadIcon,
  EditIcon,
} from "../../components/icons";

type Tab = "inspiration" | "themes" | "components" | "media";

const STORAGE_BASE = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`
  : "";

function imageUrl(bucket: string, path: string): string {
  return `${STORAGE_BASE}/${bucket}/${path}`;
}

export default function AdminContent() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [tab, setTab] = useState<Tab>("inspiration");

  const tabs: { key: Tab; label: string }[] = [
    { key: "inspiration", label: t("admin.content.inspiration") },
    { key: "themes", label: t("admin.content.themes") },
    { key: "components", label: t("admin.content.components") },
    { key: "media", label: t("admin.content.media") },
  ];

  return (
    <div className="admin-content">
      <div className="admin-page-header">
        <h1 className="admin-page-title">{t("admin.content.title")}</h1>
      </div>

      <div className="admin-sub-tabs">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            className={`admin-sub-tab ${tab === tb.key ? "active" : ""}`}
            onClick={() => setTab(tb.key)}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === "inspiration" && <InspirationTab />}
      {tab === "themes" && <ThemesTab />}
      {tab === "components" && <ComponentsTab />}
      {tab === "media" && <MediaTab />}
    </div>
  );
}

// ── Image Upload Helper ──────────────────────────────────────
function ImageUploadButton({
  onUpload,
  label,
  bucket,
}: {
  onUpload: (file: File) => Promise<void>;
  label: string;
  bucket: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      <button
        className="admin-toggle-chip"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <UploadIcon size={14} />
        {uploading ? "Uploading..." : label}
      </button>
      {error && <div className="admin-error" style={{ marginTop: 8 }}>{error}</div>}
      {bucket && <span style={{ display: "none" }}>{bucket}</span>}
    </div>
  );
}

// ── Inspiration Tab ──────────────────────────────────────────
type InspirationPostWithMedia = InspirationPost & { media?: InspirationMedia[] };

function InspirationTab() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [posts, setPosts] = useState<InspirationPostWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<InspirationPostWithMedia | null>(null);

  const reload = () => {
    adminApi.getInspirationPosts().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, []);

  const togglePublish = async (post: InspirationPostWithMedia) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    const updates = {
      status: newStatus as InspirationPost["status"],
      published_at: newStatus === "published" ? new Date().toISOString() : null,
    };
    await adminApi.updateInspirationPost(post.id, updates);
    setPosts(posts.map((p) => (p.id === post.id ? { ...p, ...updates } : p)));
  };

  const toggleFeatured = async (post: InspirationPostWithMedia) => {
    await adminApi.updateInspirationPost(post.id, { is_featured: !post.is_featured });
    reload();
  };

  const handleDelete = async (post: InspirationPostWithMedia) => {
    if (!confirm(`"${post.title}" verwijderen?`)) return;
    await adminApi.deleteInspirationPost(post.id);
    reload();
  };

  if (loading) {
    return (
      <div className="admin-grid-3">
        {[0, 1, 2].map((i) => <div key={i} className="admin-content-card admin-skeleton" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="admin-content-actions">
        <button
          className="admin-btn-primary admin-btn-sm"
          onClick={() => { setEditingPost(null); setShowForm(!showForm); }}
        >
          <PlusIcon size={18} />
          {t("admin.content.add_inspiration")}
        </button>
      </div>

      {showForm && (
        <InspirationForm
          post={editingPost}
          onClose={() => { setShowForm(false); setEditingPost(null); }}
          onSaved={() => { setShowForm(false); setEditingPost(null); reload(); }}
        />
      )}

      {posts.length === 0 ? (
        <div className="admin-empty">{t("admin.content.empty")}</div>
      ) : (
        <div className="admin-grid-3">
          {posts.map((post) => (
            <div key={post.id} className="admin-content-card">
              <div className="admin-content-card-image">
                {post.media && post.media.length > 0 ? (
                  <img
                    src={imageUrl("inspiration-media", post.media[0].storage_path)}
                    alt={post.media[0].alt_text ?? post.title}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="admin-content-card-placeholder">
                    <ImageIcon size={32} />
                  </div>
                )}
                {post.is_featured && (
                  <button
                    className="admin-content-card-featured admin-content-card-featured-btn"
                    onClick={(e) => { e.stopPropagation(); toggleFeatured(post); }}
                  >
                    <StarIcon size={14} />
                  </button>
                )}
                <span className={`admin-status-badge admin-status-${post.status}`}>
                  {t(`admin.content.${post.status}`)}
                </span>
              </div>
              <div className="admin-content-card-body">
                <h3 className="admin-content-card-title">{post.title}</h3>
                {post.description && (
                  <p className="admin-content-card-desc">{post.description}</p>
                )}
                {post.color_tags && post.color_tags.length > 0 && (
                  <div className="admin-theme-colors" style={{ marginBottom: 8 }}>
                    {post.color_tags.map((c, i) => (
                      <div key={i} className="admin-theme-color-swatch" style={{ background: c }} title={c} />
                    ))}
                  </div>
                )}
                <div className="admin-content-card-actions">
                  <button
                    className="admin-toggle-chip"
                    onClick={() => { setEditingPost(post); setShowForm(true); }}
                  >
                    <EditIcon size={14} />
                    {t("admin.common.edit")}
                  </button>
                  <button
                    className="admin-toggle-chip"
                    onClick={() => togglePublish(post)}
                  >
                    <CheckIcon size={14} />
                    {post.status === "published" ? t("admin.content.unpublish") : t("admin.content.publish")}
                  </button>
                  {!post.is_featured && (
                    <button
                      className="admin-toggle-chip"
                      onClick={() => toggleFeatured(post)}
                    >
                      <StarIcon size={14} />
                      {t("admin.content.featured")}
                    </button>
                  )}
                  <button
                    className="admin-toggle-chip admin-toggle-danger"
                    onClick={() => handleDelete(post)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InspirationForm({
  post,
  onClose,
  onSaved,
}: {
  post: InspirationPostWithMedia | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [title, setTitle] = useState(post?.title ?? "");
  const [description, setDescription] = useState(post?.description ?? "");
  const [colorTags, setColorTags] = useState(
    Array.isArray(post?.color_tags) ? post!.color_tags.join(", ") : "",
  );
  const [media, setMedia] = useState<InspirationMedia[]>(post?.media ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    const palette = colorTags.split(",").map((c) => c.trim()).filter(Boolean);

    if (post) {
      const { error: err } = await adminApi.updateInspirationPost(post.id, {
        title,
        description: description || null,
        color_tags: palette,
      });
      if (err) { setError(err); setSaving(false); return; }
      onSaved();
    } else {
      const { data, error: err } = await adminApi.createInspirationPost({
        title,
        description: description || undefined,
        color_tags: palette,
      });
      if (err) { setError(err); setSaving(false); return; }
      if (data) {
        setMedia([]);
        onSaved();
      }
    }
  };

  const handleUpload = async (file: File) => {
    if (!post) return;
    const { data, error: err } = await adminApi.uploadInspirationImage(post.id, file, media.length === 0);
    if (err) throw new Error(err);
    if (data) {
      setMedia([...media, data as InspirationMedia]);
    }
  };

  const handleDeleteImage = async (m: InspirationMedia) => {
    if (!post) return;
    await adminApi.deleteInspirationImage(m.id, m.storage_path);
    setMedia(media.filter((x) => x.id !== m.id));
  };

  return (
    <div className="admin-form-card">
      <h3 className="admin-form-title">
        {post ? t("admin.common.edit") : t("admin.content.add_inspiration")}
      </h3>
      <div className="admin-field">
        <label className="admin-field-label">{t("admin.content.title_label")}</label>
        <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">{t("admin.content.description")}</label>
        <textarea className="admin-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">{t("admin.content.color_tags")}</label>
        <input className="admin-input" value={colorTags} onChange={(e) => setColorTags(e.target.value)} placeholder="#F8E1E7, #E8C4D0, rood, goud" />
      </div>

      {post && (
        <div className="admin-field">
          <label className="admin-field-label">Afbeeldingen</label>
          {media.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
              {media.map((m) => (
                <div key={m.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden" }}>
                  <img src={imageUrl("inspiration-media", m.storage_path)} alt={m.alt_text ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {m.is_cover && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "var(--warning)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <StarIcon size={10} />
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteImage(m)}
                    style={{ position: "absolute", bottom: 4, left: 4, width: 24, height: 24, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <ImageUploadButton onUpload={handleUpload} label="Upload afbeelding" bucket="inspiration-media" />
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
      <div className="admin-form-actions">
        <button className="admin-btn-secondary" onClick={onClose}>{t("admin.content.cancel")}</button>
        <button className="admin-btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? t("admin.common.loading") : t("admin.content.save")}
        </button>
      </div>
      {!post && (
        <p className="admin-empty" style={{ fontSize: "0.75rem", padding: "var(--s2)" }}>
          Sla eerst op om afbeeldingen te kunnen uploaden.
        </p>
      )}
    </div>
  );
}

// ── Themes Tab ───────────────────────────────────────────────
function ThemesTab() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [themes, setThemes] = useState<AdminTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTheme, setEditingTheme] = useState<AdminTheme | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminTheme | null>(null);

  const reload = () => {
    adminApi.getThemes().then((data) => {
      setThemes(data);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, []);

  const togglePublish = async (theme: AdminTheme) => {
    await adminApi.updateTheme(theme.id, { is_published: !theme.is_published });
    reload();
  };

  const toggleFeatured = async (theme: AdminTheme) => {
    await adminApi.updateTheme(theme.id, { is_featured: !theme.is_featured });
    reload();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await adminApi.deleteTheme(confirmDelete.id);
    setConfirmDelete(null);
    reload();
  };

  if (loading) return <div className="admin-empty">{t("admin.common.loading")}</div>;

  return (
    <div>
      <div className="admin-content-actions">
        <button
          className="admin-btn-primary admin-btn-sm"
          onClick={() => { setEditingTheme(null); setShowForm(!showForm); }}
        >
          <PlusIcon size={18} />
          {t("admin.overview.new_theme")}
        </button>
      </div>

      {showForm && (
        <ThemeForm
          theme={editingTheme}
          onClose={() => { setShowForm(false); setEditingTheme(null); }}
          onSaved={() => { setShowForm(false); setEditingTheme(null); reload(); }}
        />
      )}

      {themes.length === 0 ? (
        <div className="admin-empty">{t("admin.content.empty")}</div>
      ) : (
        <div className="admin-grid-3">
          {themes.map((theme) => {
            const palette = Array.isArray(theme.color_palette) ? (theme.color_palette as string[]) : [];
            return (
              <div key={theme.id} className="admin-content-card">
                <div className="admin-content-card-image">
                  {theme.cover_image_path ? (
                    <img src={imageUrl("inspiration-media", theme.cover_image_path)} alt={theme.name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="admin-content-card-placeholder"><ImageIcon size={32} /></div>
                  )}
                  {theme.is_featured && (
                    <button
                      className="admin-content-card-featured admin-content-card-featured-btn"
                      onClick={(e) => { e.stopPropagation(); toggleFeatured(theme); }}
                    >
                      <StarIcon size={14} />
                    </button>
                  )}
                  <span className={`admin-status-badge ${theme.is_published ? "admin-status-published" : "admin-status-draft"}`}>
                    {theme.is_published ? "Published" : "Draft"}
                  </span>
                </div>
                <div className="admin-content-card-body">
                  <h3 className="admin-content-card-title">{theme.name}</h3>
                  {theme.description && <p className="admin-content-card-desc">{theme.description}</p>}
                  {palette.length > 0 && (
                    <div className="admin-theme-colors">
                      {palette.map((color, i) => (
                        <div key={i} className="admin-theme-color-swatch" style={{ background: color }} title={color} />
                      ))}
                    </div>
                  )}
                  <div className="admin-content-card-actions">
                    <button
                      className="admin-toggle-chip"
                      onClick={() => { setEditingTheme(theme); setShowForm(true); }}
                    >
                      <EditIcon size={14} />
                      {t("admin.common.edit")}
                    </button>
                    <button
                      className="admin-toggle-chip"
                      onClick={() => togglePublish(theme)}
                    >
                      <CheckIcon size={14} />
                      {theme.is_published ? t("admin.content.unpublish") : t("admin.content.publish")}
                    </button>
                    {!theme.is_featured && (
                      <button
                        className="admin-toggle-chip"
                        onClick={() => toggleFeatured(theme)}
                      >
                        <StarIcon size={14} />
                        {t("admin.content.featured")}
                      </button>
                    )}
                    <button
                      className="admin-toggle-chip admin-toggle-danger"
                      onClick={() => setConfirmDelete(theme)}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="admin-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="admin-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-confirm-title">{t("admin.common.delete")} "{confirmDelete.name}"?</h3>
            <p className="admin-confirm-body">
              Dit verwijdert het thema permanent. Bestaande concepten die dit thema gebruiken, behouden hun gegevens.
            </p>
            <div className="admin-form-actions">
              <button className="admin-btn-secondary" onClick={() => setConfirmDelete(null)}>
                {t("admin.common.cancel")}
              </button>
              <button className="admin-btn-primary admin-btn-danger" onClick={handleDelete}>
                {t("admin.common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThemeForm({
  theme,
  onClose,
  onSaved,
}: {
  theme: AdminTheme | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [name, setName] = useState(theme?.name ?? "");
  const [slug, setSlug] = useState(theme?.slug ?? "");
  const [description, setDescription] = useState(theme?.description ?? "");
  const [colors, setColors] = useState(
    Array.isArray(theme?.color_palette) ? (theme!.color_palette as string[]).join(", ") : "",
  );
  const [sortOrder, setSortOrder] = useState(theme?.sort_order ?? 99);
  const [coverPath, setCoverPath] = useState(theme?.cover_image_path ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const palette = colors.split(",").map((c) => c.trim()).filter(Boolean);
    if (theme) {
      const { error: err } = await adminApi.updateTheme(theme.id, {
        name,
        slug: slug || undefined,
        description: description || undefined,
        color_palette: palette,
        sort_order: sortOrder,
      });
      if (err) { setError(err); setSaving(false); return; }
    } else {
      const { error: err } = await adminApi.createTheme({
        name,
        slug: slug || undefined,
        description: description || undefined,
        color_palette: palette,
        sort_order: sortOrder,
      });
      if (err) { setError(err); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  };

  const handleUploadCover = async (file: File) => {
    if (!theme) return;
    const { data, error: err } = await adminApi.uploadThemeCover(theme.id, file);
    if (err) throw new Error(err);
    if (data) setCoverPath(data);
  };

  return (
    <div className="admin-form-card">
      <h3 className="admin-form-title">
        {theme ? t("admin.common.edit") : t("admin.overview.new_theme")}
      </h3>

      {theme && coverPath && (
        <div style={{ marginBottom: 16, borderRadius: 8, overflow: "hidden", aspectRatio: "4/3" }}>
          <img src={imageUrl("inspiration-media", coverPath)} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}

      <div className="admin-field">
        <label className="admin-field-label">{t("admin.content.title_label")}</label>
        <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">Slug</label>
        <input
          className="admin-input"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ballet, jungle, pastel-party"
        />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">{t("admin.content.description")}</label>
        <textarea
          className="admin-textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">{t("admin.content.color_tags")}</label>
        <input
          className="admin-input"
          value={colors}
          onChange={(e) => setColors(e.target.value)}
          placeholder="#F8E1E7, #E8C4D0, #806F60"
        />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">Sortering</label>
        <input
          className="admin-input"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
      </div>

      {theme && (
        <div className="admin-field">
          <label className="admin-field-label">Cover afbeelding</label>
          <ImageUploadButton onUpload={handleUploadCover} label="Upload cover" bucket="inspiration-media" />
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
      <div className="admin-form-actions">
        <button className="admin-btn-secondary" onClick={onClose}>{t("admin.content.cancel")}</button>
        <button className="admin-btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? t("admin.common.loading") : t("admin.content.save")}
        </button>
      </div>
    </div>
  );
}

// ── Components Tab ───────────────────────────────────────────
type Category = { id: string; step_key: string; title: string; sort_order: number };
type Component = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  base_price: number;
  pricing_unit: string;
  vat_rate: number;
  price_includes_vat: boolean;
  requires_large_bus: boolean;
  requires_consultation: boolean;
  minimum_quantity: number;
  maximum_quantity: number;
  dimensions: string | null;
  indoor_outdoor: string | null;
  is_active: boolean;
  sort_order: number;
  key: string | null;
  component_media?: { id: string; storage_path: string; alt_text: string | null; is_primary: boolean }[];
};

const PRICING_UNITS = ["one_time", "per_table", "per_child", "per_participating_child"];

function ComponentsTab() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [categories, setCategories] = useState<Category[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState<Component | null>(null);

  const reload = () => {
    Promise.all([
      adminApi.getCategories(),
      adminApi.getComponents(),
    ]).then(([cats, comps]) => {
      setCategories(cats as Category[]);
      setComponents(comps as Component[]);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, []);

  const filtered = selectedCat ? components.filter((c) => c.category_id === selectedCat) : components;

  const toggleActive = async (comp: Component) => {
    await adminApi.updateComponent(comp.id, { is_active: !comp.is_active });
    reload();
  };

  const handleDelete = async (comp: Component) => {
    if (!confirm(`"${comp.name}" verwijderen?`)) return;
    await adminApi.deleteComponent(comp.id);
    reload();
  };

  if (loading) return <div className="admin-empty">{t("admin.common.loading")}</div>;

  return (
    <div>
      <div className="admin-content-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="admin-btn-primary admin-btn-sm"
          onClick={() => { setEditingComponent(null); setShowForm(!showForm); }}
        >
          <PlusIcon size={18} />
          Nieuw onderdeel
        </button>
        <select
          className="admin-select"
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="">Alle categorieën</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.title}</option>
          ))}
        </select>
      </div>

      {showForm && (
        <ComponentForm
          component={editingComponent}
          categories={categories}
          onClose={() => { setShowForm(false); setEditingComponent(null); }}
          onSaved={() => { setShowForm(false); setEditingComponent(null); reload(); }}
        />
      )}

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <PackageIcon size={32} />
          <p>Geen onderdelen gevonden.</p>
        </div>
      ) : (
        <div className="admin-list">
          {filtered.map((comp) => {
            const cat = categories.find((c) => c.id === comp.category_id);
            const img = comp.component_media?.find((m) => m.is_primary) ?? comp.component_media?.[0];
            return (
              <div key={comp.id} className="admin-content-card" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "var(--soft-surface)" }}>
                  {img ? (
                    <img src={imageUrl("component-media", img.storage_path)} alt={img.alt_text ?? comp.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--taupe-light)" }}>
                      <PackageIcon size={20} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{comp.name}</span>
                    <span className={`admin-status-badge ${comp.is_active ? "admin-status-published" : "admin-status-draft"}`}>
                      {comp.is_active ? "Actief" : "Inactief"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--taupe)", marginTop: 2 }}>
                    {cat?.title ?? "Geen categorie"} · €{Number(comp.base_price).toFixed(2)} / {comp.pricing_unit}
                    {comp.requires_large_bus && " · 🚐"}
                  </div>
                </div>
                <div className="admin-content-card-actions" style={{ flexShrink: 0 }}>
                  <button className="admin-toggle-chip" onClick={() => { setEditingComponent(comp); setShowForm(true); }}>
                    <EditIcon size={14} />
                  </button>
                  <button className="admin-toggle-chip" onClick={() => toggleActive(comp)}>
                    <CheckIcon size={14} />
                    {comp.is_active ? "Deactiveren" : "Activeren"}
                  </button>
                  <button className="admin-toggle-chip admin-toggle-danger" onClick={() => handleDelete(comp)}>
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ComponentForm({
  component,
  categories,
  onClose,
  onSaved,
}: {
  component: Component | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(component?.name ?? "");
  const [description, setDescription] = useState(component?.description ?? "");
  const [categoryId, setCategoryId] = useState(component?.category_id ?? categories[0]?.id ?? "");
  const [basePrice, setBasePrice] = useState(component?.base_price ?? 0);
  const [pricingUnit, setPricingUnit] = useState(component?.pricing_unit ?? "one_time");
  const [vatRate, setVatRate] = useState(component?.vat_rate ?? 21);
  const [includesVat, setIncludesVat] = useState(component?.price_includes_vat ?? true);
  const [requiresBus, setRequiresBus] = useState(component?.requires_large_bus ?? false);
  const [requiresConsultation, setRequiresConsultation] = useState(component?.requires_consultation ?? false);
  const [minQty, setMinQty] = useState(component?.minimum_quantity ?? 1);
  const [maxQty, setMaxQty] = useState(component?.maximum_quantity ?? 100);
  const [dimensions, setDimensions] = useState(component?.dimensions ?? "");
  const [indoorOutdoor, setIndoorOutdoor] = useState(component?.indoor_outdoor ?? "");
  const [sortOrder, setSortOrder] = useState(component?.sort_order ?? 99);
  const [key, setKey] = useState(component?.key ?? "");
  const [media, setMedia] = useState(component?.component_media ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);

    const updates = {
      name,
      description: description || null,
      category_id: categoryId || null,
      base_price: basePrice,
      pricing_unit: pricingUnit,
      vat_rate: vatRate,
      price_includes_vat: includesVat,
      requires_large_bus: requiresBus,
      requires_consultation: requiresConsultation,
      minimum_quantity: minQty,
      maximum_quantity: maxQty,
      dimensions: dimensions || null,
    };

    if (component) {
      const { error: err } = await adminApi.updateComponent(component.id, updates);
      if (err) { setError(err); setSaving(false); return; }
      onSaved();
    } else {
      const { data, error: err } = await adminApi.createComponent(updates as { name: string; category_id: string; base_price: number; pricing_unit: string; description?: string; vat_rate?: number; price_includes_vat?: boolean; requires_large_bus?: boolean; requires_consultation?: boolean; minimum_quantity?: number; maximum_quantity?: number; dimensions?: string; indoor_outdoor?: string; sort_order?: number; key?: string });
      if (err) { setError(err); setSaving(false); return; }
      if (data) onSaved();
    }
  };

  const handleUpload = async (file: File) => {
    if (!component) return;
    const { data, error: err } = await adminApi.uploadComponentImage(component.id, file, media.length === 0);
    if (err) throw new Error(err);
    if (data) setMedia([...media, data as { id: string; storage_path: string; alt_text: string | null; is_primary: boolean }]);
  };

  const handleDeleteImage = async (m: { id: string; storage_path: string }) => {
    if (!component) return;
    await adminApi.deleteComponentImage(m.id, m.storage_path);
    setMedia(media.filter((x) => x.id !== m.id));
  };

  return (
    <div className="admin-form-card">
      <h3 className="admin-form-title">
        {component ? "Onderdeel bewerken" : "Nieuw onderdeel"}
      </h3>

      {component && media.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {media.map((m) => (
            <div key={m.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden" }}>
              <img src={imageUrl("component-media", m.storage_path)} alt={m.alt_text ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {m.is_primary && (
                <div style={{ position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: "50%", background: "var(--warning)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>★</div>
              )}
              <button
                onClick={() => handleDeleteImage(m)}
                style={{ position: "absolute", bottom: 4, left: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <TrashIcon size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="admin-field">
        <label className="admin-field-label">Naam</label>
        <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">Beschrijving</label>
        <textarea className="admin-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="admin-field">
          <label className="admin-field-label">Categorie</label>
          <select className="admin-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: "100%", padding: "10px 14px" }}>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.title}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Key (unieke ID)</label>
          <input className="admin-input" value={key} onChange={(e) => setKey(e.target.value)} placeholder={name.toLowerCase().replace(/\s+/g, "-")} disabled={!!component} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="admin-field">
          <label className="admin-field-label">Basisprijs (€)</label>
          <input className="admin-input" type="number" step="0.01" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Prijseenheid</label>
          <select className="admin-select" value={pricingUnit} onChange={(e) => setPricingUnit(e.target.value)} style={{ width: "100%", padding: "10px 14px" }}>
            {PRICING_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="admin-field">
          <label className="admin-field-label">BTW tarief (%)</label>
          <input className="admin-input" type="number" step="0.01" value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Sortering</label>
          <input className="admin-input" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="admin-field">
          <label className="admin-field-label">Min. aantal</label>
          <input className="admin-input" type="number" value={minQty} onChange={(e) => setMinQty(Number(e.target.value))} />
        </div>
        <div className="admin-field">
          <label className="admin-field-label">Max. aantal</label>
          <input className="admin-input" type="number" value={maxQty} onChange={(e) => setMaxQty(Number(e.target.value))} />
        </div>
      </div>
      <div className="admin-field">
        <label className="admin-field-label">Afmetingen</label>
        <input className="admin-input" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="bv. 200×200 cm" />
      </div>
      <div className="admin-field">
        <label className="admin-field-label">Binnen/Buiten</label>
        <select className="admin-select" value={indoorOutdoor} onChange={(e) => setIndoorOutdoor(e.target.value)} style={{ width: "100%", padding: "10px 14px" }}>
          <option value="">Beide</option>
          <option value="indoor">Binnen</option>
          <option value="outdoor">Buiten</option>
        </select>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
          <input type="checkbox" checked={includesVat} onChange={(e) => setIncludesVat(e.target.checked)} />
          Prijs inclusief BTW
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
          <input type="checkbox" checked={requiresBus} onChange={(e) => setRequiresBus(e.target.checked)} />
          Vereist grote bus
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", cursor: "pointer" }}>
          <input type="checkbox" checked={requiresConsultation} onChange={(e) => setRequiresConsultation(e.target.checked)} />
          Vereist overleg
        </label>
      </div>

      {component && (
        <div className="admin-field">
          <label className="admin-field-label">Afbeeldingen</label>
          <ImageUploadButton onUpload={handleUpload} label="Upload afbeelding" bucket="component-media" />
        </div>
      )}

      {error && <div className="admin-error">{error}</div>}
      <div className="admin-form-actions">
        <button className="admin-btn-secondary" onClick={onClose}>Annuleren</button>
        <button className="admin-btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Opslaan..." : "Opslaan"}
        </button>
      </div>
      {!component && (
        <p className="admin-empty" style={{ fontSize: "0.75rem", padding: "var(--s2)" }}>
          Sla eerst op om afbeeldingen te kunnen uploaden.
        </p>
      )}
    </div>
  );
}

// ── Media Tab ────────────────────────────────────────────────
function MediaTab() {
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [media, setMedia] = useState<Array<{ id: string; storage_path: string; alt_text: string | null; post_id: string; inspiration_posts?: { title: string } }>>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    adminApi.getAllMedia().then((data) => {
      setMedia(data as Array<{ id: string; storage_path: string; alt_text: string | null; post_id: string; inspiration_posts?: { title: string } }>);
      setLoading(false);
    });
  };

  useEffect(() => { reload(); }, []);

  const handleDelete = async (m: { id: string; storage_path: string }) => {
    if (!confirm("Deze afbeelding verwijderen?")) return;
    await adminApi.deleteInspirationImage(m.id, m.storage_path);
    reload();
  };

  if (loading) return <div className="admin-empty">{t("admin.common.loading")}</div>;

  return (
    <div>
      {media.length === 0 ? (
        <div className="admin-empty">
          <ImageIcon size={32} />
          <p>Mediabibliotheek is leeg. Upload afbeeldingen via Inspiratie.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {media.map((m) => (
            <div key={m.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", border: "0.5px solid var(--admin-border)" }}>
              <img
                src={imageUrl("inspiration-media", m.storage_path)}
                alt={m.alt_text ?? ""}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
              />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)", padding: "20px 8px 6px", fontSize: "0.6875rem", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.inspiration_posts?.title ?? "Onbekend"}
              </div>
              <button
                onClick={() => handleDelete(m)}
                style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <TrashIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
