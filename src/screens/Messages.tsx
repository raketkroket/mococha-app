import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../data/api";
import { useAuth } from "../store/auth";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { ChevronRight } from "../components/icons";

interface Conversation {
  id: string;
  subject: string;
  category: string | null;
  concept_id: string | null;
  status: string;
  last_message_at: string | null;
  unread_by_user: boolean;
  created_at: string;
  last_preview?: string | null;
}

export default function Messages() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const { t, lang } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversations")
        .select("id, subject, category, concept_id, status, last_message_at, unread_by_user, created_at")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });
      if (cancelled) return;
      const rows = (data as Conversation[]) ?? [];
      if (rows.length === 0) { setConversations([]); setLoading(false); return; }
      const { data: msgs } = await supabase
        .from("conversation_messages")
        .select("conversation_id, body, created_at")
        .in("conversation_id", rows.map((r) => r.id))
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const previewMap: Record<string, string> = {};
      for (const m of (msgs ?? []) as { conversation_id: string; body: string }[]) {
        if (!(m.conversation_id in previewMap)) previewMap[m.conversation_id] = m.body;
      }
      setConversations(rows.map((r) => ({ ...r, last_preview: previewMap[r.id] ?? null })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!supabase || !user) return;
    const sb = supabase;
    const channel = sb
      .channel(`conversations-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `user_id=eq.${user.id}` },
        () => {
          sb
            .from("conversations")
            .select("id, subject, category, concept_id, status, last_message_at, unread_by_user, created_at")
            .eq("user_id", user.id)
            .order("last_message_at", { ascending: false })
            .then(({ data }) => {
              const rows = (data as Conversation[]) ?? [];
              setConversations(rows.map((r) => ({ ...r, last_preview: null })));
            });
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [user]);

  const unread = conversations.filter((c) => c.unread_by_user);
  const open = conversations.filter((c) => !c.unread_by_user && c.status !== "resolved");
  const resolved = conversations.filter((c) => c.status === "resolved" && !c.unread_by_user);

  const fmtTime = (iso: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(lang === "nl" ? "nl-NL" : "en-US", { day: "numeric", month: "short" });
  };

  const openConv = (id: string) => {
    haptic("light");
    navigate(`/account/berichten/${id}`);
  };

  const renderRow = (c: Conversation) => (
    <button
      key={c.id}
      className="info-row"
      style={{ cursor: "pointer", padding: "var(--s4) 0", alignItems: "center" }}
      onClick={() => openConv(c.id)}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: "var(--r-full)", flexShrink: 0,
          background: "var(--soft-surface)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--serif)", fontWeight: 600, fontSize: "0.95rem",
          color: "var(--mococha-brown)",
        }}
      >M</div>
      <div className="f1" style={{ minWidth: 0 }}>
        <div className="rb">
          <span
            style={{
              fontWeight: c.unread_by_user ? 600 : 500,
              fontSize: "0.9375rem",
              color: "var(--near-black)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              maxWidth: "calc(100% - 56px)",
            }}
          >{c.subject}</span>
          <span className="muted" style={{ fontSize: "0.72rem", flexShrink: 0 }}>{fmtTime(c.last_message_at)}</span>
        </div>
        {c.concept_id && (
          <div className="muted" style={{ fontSize: "0.72rem", marginTop: 1 }}>{t("messages.concept_ref")}</div>
        )}
        {c.last_preview && (
          <div
            className="muted"
            style={{
              fontSize: "0.8125rem", marginTop: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >{c.last_preview}</div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", flexShrink: 0 }}>
        {c.unread_by_user && (
          <span
            style={{
              width: 8, height: 8, borderRadius: "var(--r-full)",
              background: "var(--chocolate)",
            }}
          />
        )}
        <ChevronRight size={18} style={{ color: "var(--taupe-light)" }} />
      </div>
    </button>
  );

  const renderSection = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null;
    return (
      <div className="sec" style={{ marginTop: "var(--s6)" }}>
        <div className="eyebrow mb8">{title} · {items.length}</div>
        <div>{items.map(renderRow)}</div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="screen-title mb8">{t("messages.title")}</h1>
      <p className="muted mb24" style={{ fontSize: "0.875rem" }}>{t("messages.desc")}</p>

      {loading && (
        <div className="col g12">
          {[0, 1, 2].map((i) => (
            <div key={i} className="sk" style={{ height: 64, borderRadius: "var(--r-md)" }} />
          ))}
        </div>
      )}

      {!loading && conversations.length === 0 && (
        <div className="empty">
          <div className="empty-monogram">M</div>
          <h3>{t("messages.noMessages")}</h3>
          <p>{t("messages.noMessagesDesc")}</p>
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <>
          {renderSection(t("messages.unread"), unread)}
          {renderSection(t("messages.open_conversations"), open)}
          {renderSection(t("messages.resolved"), resolved)}
        </>
      )}
    </div>
  );
}
