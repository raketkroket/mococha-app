import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { adminApi } from "../api";
import { supabase } from "../../data/api";
import { usePrefs } from "../../store/prefs";
import { createAdminT } from "../i18n";
import type { AdminConversation, PreparedReply } from "../types";
import { SendIcon } from "../../components/icons";

export default function AdminConversationDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { language } = usePrefs();
  const t = createAdminT(language);
  const [conversation, setConversation] = useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [preparedReplies, setPreparedReplies] = useState<PreparedReply[]>([]);
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      adminApi.getConversationMessages(id),
    ]).then(([msgs]) => {
      setMessages(msgs as Array<Record<string, unknown>>);
      setLoading(false);
    });

    if (supabase) {
      supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle()
        .then(({ data }) => setConversation(data as AdminConversation | null));

      supabase
        .from("prepared_replies")
        .select("*")
        .order("category")
        .then(({ data }) => setPreparedReplies((data as PreparedReply[]) || []));
    }
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!supabase || !id) return;
    const sb = supabase;
    const channel = sb
      .channel(`admin-conv-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${id}` },
        () => {
          adminApi.getConversationMessages(id).then((msgs) => {
            setMessages(msgs as Array<Record<string, unknown>>);
          });
        },
      )
      .subscribe();
    return () => { sb.removeChannel(channel); };
  }, [id]);

  const handleSend = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    if (isInternal) {
      await adminApi.addInternalNote(id, reply);
    } else {
      await adminApi.sendMessage(id, reply);
    }
    setReply("");
    setSending(false);
    const msgs = await adminApi.getConversationMessages(id);
    setMessages(msgs as Array<Record<string, unknown>>);
  };

  const usePreparedReply = (pr: PreparedReply) => {
    setReply(pr.body);
    setShowReplies(false);
  };

  const closeConversation = async () => {
    await adminApi.closeConversation(id);
    navigate("/admin/berichten");
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-loading-dot" /></div>;
  }

  return (
    <div className="admin-conversation">
      <div className="admin-conversation-header">
        <button className="admin-back-btn" onClick={() => navigate("/admin/berichten")}>
          {t("admin.detail.back")}
        </button>
        <div className="admin-conversation-info">
          <h2 className="admin-conversation-subject">{conversation?.subject ?? "Bericht"}</h2>
          <span className="admin-conversation-customer">
            {conversation?.customer_name ?? conversation?.customer_email ?? "Onbekend"}
          </span>
        </div>
        <button className="admin-btn-secondary admin-btn-sm" onClick={closeConversation}>
          {t("admin.messages.close")}
        </button>
      </div>

      <div className="admin-conversation-messages" ref={scrollRef}>
        {messages.map((msg) => {
          const sender = msg.sender as string;
          const isInternalMsg = msg.email_status === "internal";
          const isMine = sender === "admin" && !isInternalMsg;
          return (
            <div
              key={msg.id as string}
              className={`admin-msg-bubble ${isMine ? "mine" : ""} ${isInternalMsg ? "internal" : ""}`}
            >
              {isInternalMsg && <div className="admin-msg-internal-label">Intern</div>}
              <div className="admin-msg-text">{msg.body as string}</div>
              <div className="admin-msg-time">
                {new Date(msg.created_at as string).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>

      {showReplies && (
        <div className="admin-prepared-replies-panel">
          <div className="admin-prepared-replies-header">
            <span>{t("admin.messages.prepared_replies")}</span>
            <button onClick={() => setShowReplies(false)}>×</button>
          </div>
          <div className="admin-prepared-replies-list">
            {preparedReplies.map((pr) => (
              <button
                key={pr.id}
                className="admin-prepared-reply-item"
                onClick={() => usePreparedReply(pr)}
              >
                <span className="admin-prepared-reply-title">{pr.title}</span>
                <span className="admin-prepared-reply-preview">{pr.body.slice(0, 80)}...</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="admin-conversation-composer">
        <div className="admin-composer-toggles">
          <button
            className={`admin-toggle-chip ${isInternal ? "active" : ""}`}
            onClick={() => setIsInternal(!isInternal)}
          >
            {t("admin.messages.internal_note")}
          </button>
          <button
            className="admin-toggle-chip"
            onClick={() => setShowReplies(!showReplies)}
          >
            {t("admin.messages.prepared_replies")}
          </button>
        </div>
        <div className="admin-composer-input-row">
          <textarea
            className="admin-composer-textarea"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={isInternal ? "Interne notitie..." : "Typ je antwoord..."}
            rows={2}
          />
          <button
            className="admin-btn-primary admin-btn-icon"
            onClick={handleSend}
            disabled={!reply.trim() || sending}
          >
            <SendIcon size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
