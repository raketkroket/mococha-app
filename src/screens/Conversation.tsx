import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../data/api";
import { useAuth } from "../store/auth";
import { useI18n } from "../i18n";
import { haptic } from "../lib/adapters/haptics";
import { ArrowLeft, CheckIcon, AlertIcon, ClockIcon, PaperclipIcon, SendIcon, XIcon } from "../components/icons";

interface Message {
  id: string;
  conversation_id: string;
  sender: "user" | "admin";
  author_id: string | null;
  body: string;
  attachments: { name: string; url: string }[] | null;
  email_status: "pending" | "sent" | "delivered" | "failed" | "not_applicable";
  email_error: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  subject: string;
  concept_id: string | null;
  status: string;
}

export default function Conversation() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const { t, lang } = useI18n();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const locale = lang === "nl" ? "nl-NL" : "en-US";

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, []);

  useEffect(() => {
    if (!supabase || !user || !id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, subject, concept_id, status")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (!conv) { setConversation(null); setLoading(false); return; }
      setConversation(conv as Conversation);
      const { data: msgs } = await supabase
        .from("conversation_messages")
        .select("id, conversation_id, sender, author_id, body, attachments, email_status, email_error, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((msgs as Message[]) ?? []);
      setLoading(false);
      scrollToBottom();
      if ((conv as Conversation).status !== "resolved") {
        await supabase.from("conversations").update({ unread_by_user: false }).eq("id", id);
      }
    })();
    return () => { cancelled = true; };
  }, [user, id, scrollToBottom]);

  useEffect(() => {
    if (!supabase || !id) return;
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          scrollToBottom();
          if (msg.sender === "admin" && supabase) {
            supabase.from("conversations").update({ unread_by_user: false }).eq("id", id).then(() => {});
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
      )
      .subscribe();
    return () => { supabase?.removeChannel(channel); };
  }, [id, scrollToBottom]);

  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !supabase || !user) return;
    setUploading(true);
    setError(null);
    const uploaded: { name: string; url: string }[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("message-attachments").upload(path, file, { upsert: false });
      if (upErr) { setError(t("messages.failed_to_send")); continue; }
      const { data: pub } = supabase.storage.from("message-attachments").getPublicUrl(path);
      uploaded.push({ name: file.name, url: pub.publicUrl });
    }
    setAttachments((prev) => [...prev, ...uploaded]);
    setUploading(false);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if (!text.trim() || sending || !user || !id) return;
    const body = text.trim();
    const pendingAttachments = attachments;
    setText("");
    setAttachments([]);
    setSending(true);
    setError(null);
    haptic("light");
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: id,
      sender: "user",
      author_id: user.id,
      body,
      attachments: pendingAttachments.length ? pendingAttachments : null,
      email_status: "pending",
      email_error: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          conversation_id: id,
          sender: "user",
          author_id: user.id,
          body,
          attachments: pendingAttachments.length ? pendingAttachments : undefined,
          user_email: user.email,
          user_name: (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name ?? user.email,
          lang,
        }),
      });
      if (!res.ok) {
        let msg = t("messages.failed_to_send");
        try { const j = await res.json(); msg = j.error === "email_not_configured" ? t("messages.email_not_configured") : t("messages.failed_to_send"); } catch {}
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, email_status: "failed", email_error: msg } : m)));
        setError(msg);
      }
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, email_status: "failed", email_error: t("messages.failed_to_send") } : m)));
      setError(t("messages.failed_to_send"));
    } finally {
      setSending(false);
    }
  };

  const statusIcon = (status: Message["email_status"]) => {
    if (status === "sent" || status === "delivered") return <CheckIcon size={12} style={{ color: "var(--success)" }} />;
    if (status === "failed") return <AlertIcon size={12} style={{ color: "var(--warning)" }} />;
    if (status === "pending") return <ClockIcon size={12} style={{ color: "var(--taupe)" }} />;
    return null;
  };

  let lastDate = "";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--warm-white)" }}>
      <div
        style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(252,251,248,0.88)",
          backdropFilter: "saturate(180%) blur(24px)",
          WebkitBackdropFilter: "saturate(180%) blur(24px)",
          borderBottom: "0.5px solid var(--hairline)",
          paddingTop: "calc(var(--st) + var(--s2))",
          paddingBottom: "var(--s2)",
          paddingLeft: "var(--screen-px)",
          paddingRight: "var(--screen-px)",
        }}
      >
        <button className="bg-link" style={{ marginBottom: 2 }} onClick={() => navigate("/account/berichten")}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowLeft size={16} /> {t("messages.back")}
          </span>
        </button>
        {conversation && (
          <>
            <h1
              className="screen-title"
              style={{ fontSize: "1.25rem", lineHeight: 1.25, marginBottom: 2 }}
            >{conversation.subject}</h1>
            {conversation.concept_id && (
              <div className="muted" style={{ fontSize: "0.72rem" }}>{t("messages.concept_ref")}</div>
            )}
          </>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: "auto",
          paddingLeft: "var(--screen-px)",
          paddingRight: "var(--screen-px)",
          paddingTop: "var(--s4)",
          paddingBottom: "var(--s4)",
        }}
      >
        {loading && <div className="muted tcenter" style={{ padding: "var(--s8) 0" }}>Loading…</div>}

        {!loading && !conversation && (
          <div className="empty">
            <div className="empty-monogram">M</div>
            <h3>{t("messages.no_conversation")}</h3>
          </div>
        )}

        {!loading && conversation && messages.length === 0 && (
          <div className="muted tcenter" style={{ padding: "var(--s8) 0" }}>{t("messages.noMessagesDesc")}</div>
        )}

        {!loading && conversation && messages.map((m) => {
          const dateLabel = fmtDate(m.created_at);
          const showDateDivider = dateLabel !== lastDate;
          lastDate = dateLabel;
          const isUser = m.sender === "user";
          return (
            <div key={m.id}>
              {showDateDivider && (
                <div className="div-label" style={{ margin: "var(--s4) 0" }}>
                  <span>{dateLabel}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  marginBottom: "var(--s2)",
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    background: isUser ? "var(--chocolate)" : "var(--soft-surface)",
                    color: isUser ? "var(--pure-white)" : "var(--near-black)",
                    borderRadius: "var(--r-lg)",
                    borderTopRightRadius: isUser ? "var(--r-sm)" : "var(--r-lg)",
                    borderTopLeftRadius: isUser ? "var(--r-lg)" : "var(--r-sm)",
                    padding: "var(--s3) var(--s4)",
                    fontSize: "0.9375rem",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="col g8" style={{ marginTop: "var(--s2)" }}>
                      {m.attachments.map((a, i) => (
                        <a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            fontSize: "0.8125rem",
                            color: isUser ? "rgba(255,255,255,0.85)" : "var(--mococha-brown)",
                            textDecoration: "underline",
                          }}
                        >{a.name}</a>
                      ))}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      marginTop: "var(--s1)",
                      fontSize: "0.68rem",
                      color: isUser ? "rgba(255,255,255,0.6)" : "var(--taupe)",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span>{fmtTime(m.created_at)}</span>
                    {isUser && statusIcon(m.email_status)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div
          style={{
            paddingLeft: "var(--screen-px)",
            paddingRight: "var(--screen-px)",
            paddingBottom: "var(--s2)",
          }}
        >
          <div className="busw">
            <AlertIcon size={14} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <div
          style={{
            paddingLeft: "var(--screen-px)",
            paddingRight: "var(--screen-px)",
            paddingBottom: "var(--s2)",
          }}
        >
          <div className="row g8" style={{ flexWrap: "wrap" }}>
            {attachments.map((a, i) => (
              <span
                key={i}
                className="chip"
                style={{ fontSize: "0.75rem", background: "var(--soft-surface)" }}
              >
                <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  style={{ display: "flex", alignItems: "center", color: "var(--taupe)" }}
                ><XIcon size={12} /></button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          flexShrink: 0,
          background: "rgba(252,251,248,0.94)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderTop: "0.5px solid var(--hairline)",
          paddingTop: "var(--s2)",
          paddingBottom: "calc(var(--s2) + var(--sb))",
          paddingLeft: "var(--screen-px)",
          paddingRight: "var(--screen-px)",
        }}
      >
        <div className="row g8" style={{ alignItems: "flex-end" }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || sending || !conversation}
            style={{
              width: 44, height: 44, borderRadius: "var(--r-md)",
              background: "var(--pure-white)", border: "0.5px solid var(--fine-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--taupe)", flexShrink: 0,
              opacity: uploading || !conversation ? 0.5 : 1,
            }}
          >
            {uploading ? <ClockIcon size={18} /> : <PaperclipIcon size={18} />}
          </button>
          <textarea
            className="ta"
            style={{ flex: 1, minHeight: 44, maxHeight: 120, padding: "var(--s2) var(--s4)", resize: "none", lineHeight: 1.4 }}
            placeholder={t("messages.reply_placeholder")}
            value={text}
            rows={1}
            disabled={!conversation}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sending || !conversation}
            style={{
              width: 44, height: 44, borderRadius: "var(--r-md)",
              background: "var(--chocolate)", color: "var(--pure-white)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              opacity: !text.trim() || sending || !conversation ? 0.4 : 1,
            }}
          >
            {sending ? <ClockIcon size={18} /> : <SendIcon size={18} />}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
