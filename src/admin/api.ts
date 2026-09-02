import { supabase } from "../data/api";
import type {
  AdminConcept,
  AdminConversation,
  AdminEvent,
  AdminQuotation,
  AdminTheme,
  AuditLog,
  EmailLog,
  InspirationPost,
  PreparedReply,
  StaffMember,
} from "./types";

function logAudit(
  action: string,
  entityType: string,
  entityId: string | null,
  beforeData?: Record<string, unknown>,
  afterData?: Record<string, unknown>,
  reason?: string,
) {
  if (!supabase) return Promise.resolve();
  return supabase.from("audit_logs").insert({
    admin_user_id: null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: beforeData ?? null,
    after_data: afterData ?? null,
    reason: reason ?? null,
  });
}

export const adminApi = {
  logAudit,

  async getStaff(): Promise<StaffMember[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("staff_roles")
      .select("*, user_email:auth.users!inner(email)")
      .order("created_at", { ascending: false });
    if (error) {
      const { data: fallback } = await supabase
        .from("staff_roles")
        .select("*")
        .order("created_at", { ascending: false });
      return (fallback as StaffMember[]) || [];
    }
    return (data as unknown as Array<StaffMember & { user_email: { email: string } }>)?.map(
      (r) => ({ ...r, email: r.user_email?.email }),
    ) || [];
  },

  async updateStaffRole(userId: string, role: StaffMember["role"], isActive: boolean) {
    if (!supabase) return { error: "Not configured" };
    const { data: before } = await supabase
      .from("staff_roles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    const { error } = await supabase
      .from("staff_roles")
      .update({ role, is_active: isActive })
      .eq("user_id", userId);
    if (!error) {
      await logAudit(
        "role_change",
        "staff_roles",
        userId,
        before as Record<string, unknown>,
        { role, is_active: isActive },
      );
    }
    return { error: error?.message ?? null };
  },

  async getConversations(): Promise<AdminConversation[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("conversations")
      .select("*, profiles!inner(email, full_name)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    if (error) {
      const { data: fallback } = await supabase
        .from("conversations")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return (fallback as AdminConversation[]) || [];
    }
    return (
      (data as unknown as Array<
        AdminConversation & { profiles: { email: string; full_name: string | null } }
      >)?.map((c) => ({
        ...c,
        customer_email: c.profiles?.email,
        customer_name: c.profiles?.full_name ?? undefined,
      })) || []
    );
  },

  async getConversationMessages(conversationId: string) {
    if (!supabase) return [];
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return data || [];
  },

  async sendMessage(
    conversationId: string,
    body: string,
    attachments: { url: string; name: string }[] = [],
  ) {
    if (!supabase) return { error: "Not configured" };
    const { data: user } = await supabase.auth.getUser();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (url && anonKey && accessToken) {
      const resp = await fetch(`${url}/functions/v1/send-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, apikey: anonKey },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender: "admin",
          author_id: user.user?.id ?? null,
          body,
          attachments,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) return { data: null, error: json.error ?? "Failed to send" };
      await logAudit("message_sent", "conversations", conversationId, undefined, { body });
      return { data: json, error: null };
    }
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender: "admin",
        author_id: user.user?.id ?? null,
        body,
        attachments,
        email_status: "not_applicable",
      })
      .select()
      .single();
    if (!error) {
      await supabase
        .from("conversations")
        .update({ unread_by_user: true, unread_by_admin: false, last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      await logAudit("message_sent", "conversations", conversationId, undefined, { body });
    }
    return { data, error: error?.message ?? null };
  },

  async addInternalNote(conversationId: string, body: string) {
    if (!supabase) return { error: "Not configured" };
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        sender: "admin",
        author_id: user.user?.id ?? null,
        body,
        attachments: [],
        email_status: "internal",
      })
      .select()
      .single();
    return { data, error: error?.message ?? null };
  },

  async assignConversation(conversationId: string, staffId: string | null) {
    if (!supabase) return { error: "Not configured" };
    const { error } = await supabase
      .from("conversations")
      .update({ assigned_to: staffId })
      .eq("id", conversationId);
    return { error: error?.message ?? null };
  },

  async closeConversation(conversationId: string) {
    if (!supabase) return { error: "Not configured" };
    const { error } = await supabase
      .from("conversations")
      .update({ status: "closed" })
      .eq("id", conversationId);
    return { error: error?.message ?? null };
  },

  async getPreparedReplies(): Promise<PreparedReply[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("prepared_replies")
      .select("*")
      .order("category", { ascending: true });
    return (data as PreparedReply[]) || [];
  },

  async getConcepts(status?: string): Promise<AdminConcept[]> {
    if (!supabase) return [];
    let query = supabase
      .from("party_builds")
      .select("*, user_email:auth.users!inner(email)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      const { data: fallback } = await supabase
        .from("party_builds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (fallback as AdminConcept[]) || [];
    }
    return (
      (data as unknown as Array<AdminConcept & { user_email: { email: string } }>)?.map((c) => ({
        ...c,
        customer_email: c.user_email?.email,
      })) || []
    );
  },

  async getConcept(id: string): Promise<AdminConcept | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from("party_builds")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data as AdminConcept | null;
  },

  async updateConceptStatus(id: string, status: string, reason?: string) {
    if (!supabase) return { error: "Not configured" };
    const { data: before } = await supabase
      .from("party_builds")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase
      .from("party_builds")
      .update({ status })
      .eq("id", id);
    if (!error) {
      await logAudit("status_change", "party_builds", id, before as Record<string, unknown>, { status }, reason);
    }
    return { error: error?.message ?? null };
  },

  async getQuotations(status?: string): Promise<AdminQuotation[]> {
    if (!supabase) return [];
    let query = supabase
      .from("admin_quotations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (status) query = query.eq("status", status);
    const { data } = await query;
    return (data as AdminQuotation[]) || [];
  },

  async getQuotation(id: string): Promise<AdminQuotation | null> {
    if (!supabase) return null;
    const { data } = await supabase
      .from("admin_quotations")
      .select("*, admin_quotation_items(*)")
      .eq("id", id)
      .maybeSingle();
    return data as AdminQuotation | null;
  },

  async getPayments() {
    if (!supabase) return [];
    const { data } = await supabase
      .from("payments")
      .select("*, party_builds(reference_number, name)")
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  },

  async getEvents(): Promise<AdminEvent[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("admin_events")
      .select("*")
      .order("start_time", { ascending: true })
      .limit(50);
    return (data as AdminEvent[]) || [];
  },

  async getInspirationPosts(status?: string): Promise<InspirationPost[]> {
    if (!supabase) return [];
    let query = supabase
      .from("inspiration_posts")
      .select("*, inspiration_media(*)")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data } = await query;
    return (data as InspirationPost[]) || [];
  },

  async updateInspirationPost(id: string, updates: Partial<InspirationPost>) {
    if (!supabase) return { error: "Not configured" };
    const { data: user } = await supabase.auth.getUser();
    const { data: before } = await supabase
      .from("inspiration_posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase
      .from("inspiration_posts")
      .update({ ...updates, updated_by: user.user?.id ?? null })
      .eq("id", id);
    if (!error) {
      await logAudit("content_update", "inspiration_posts", id, before as Record<string, unknown>, updates as Record<string, unknown>);
    }
    return { error: error?.message ?? null };
  },

  async getThemes(): Promise<AdminTheme[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("admin_themes")
      .select("*")
      .order("sort_order", { ascending: true });
    return (data as AdminTheme[]) || [];
  },

  async createTheme(theme: {
    name: string;
    slug?: string;
    description?: string;
    color_palette?: string[];
    sort_order?: number;
  }): Promise<{ data: AdminTheme | null; error: string | null }> {
    if (!supabase) return { data: null, error: "Not configured" };
    const { data: user } = await supabase.auth.getUser();
    const slug = theme.slug ?? theme.name.toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase
      .from("admin_themes")
      .insert({
        name: theme.name,
        slug,
        description: theme.description ?? null,
        color_palette: theme.color_palette ?? [],
        sort_order: theme.sort_order ?? 99,
        is_published: true,
        created_by: user.user?.id ?? null,
      })
      .select()
      .single();
    if (!error && data) {
      await supabase.from("themes").insert({
        id: data.id,
        slug: data.slug,
        title: data.name,
        description: data.description,
        colors: (data.color_palette as string[])?.join(",") ?? "",
        sort_order: data.sort_order,
      });
      await logAudit("theme_create", "admin_themes", data.id, undefined, { name: theme.name });
    }
    return { data: data as AdminTheme | null, error: error?.message ?? null };
  },

  async updateTheme(id: string, updates: Partial<AdminTheme>): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Not configured" };
    const { data: before } = await supabase
      .from("admin_themes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color_palette !== undefined) updateData.color_palette = updates.color_palette;
    if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
    if (updates.is_published !== undefined) updateData.is_published = updates.is_published;
    if (updates.is_featured !== undefined) updateData.is_featured = updates.is_featured;
    if (updates.cover_image_path !== undefined) updateData.cover_image_path = updates.cover_image_path;
    const { error } = await supabase
      .from("admin_themes")
      .update(updateData)
      .eq("id", id);
    if (!error) {
      const themeUpdate: Record<string, unknown> = {};
      if (updates.name !== undefined) themeUpdate.title = updates.name;
      if (updates.slug !== undefined) themeUpdate.slug = updates.slug;
      if (updates.description !== undefined) themeUpdate.description = updates.description;
      if (updates.sort_order !== undefined) themeUpdate.sort_order = updates.sort_order;
      if (updates.color_palette !== undefined) {
        themeUpdate.colors = (updates.color_palette as string[]).join(",");
      }
      if (Object.keys(themeUpdate).length > 0) {
        await supabase.from("themes").update(themeUpdate).eq("id", id);
      }
      await logAudit("theme_update", "admin_themes", id, before as Record<string, unknown>, updateData);
    }
    return { error: error?.message ?? null };
  },

  async deleteTheme(id: string): Promise<{ error: string | null }> {
    if (!supabase) return { error: "Not configured" };
    const { error } = await supabase
      .from("admin_themes")
      .delete()
      .eq("id", id);
    if (!error) {
      await supabase.from("themes").delete().eq("id", id);
      await logAudit("theme_delete", "admin_themes", id);
    }
    return { error: error?.message ?? null };
  },

  async getAuditLogs(limit = 50): Promise<AuditLog[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as AuditLog[]) || [];
  },

  async getEmailLogs(limit = 50): Promise<EmailLog[]> {
    if (!supabase) return [];
    const { data } = await supabase
      .from("email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data as EmailLog[]) || [];
  },

  async getOverviewStats() {
    if (!supabase)
      return {
        newMessages: 0,
        pendingConcepts: 0,
        openPayments: 0,
        upcomingEvents: 0,
      };

    const now = new Date().toISOString();
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [convRes, conceptRes, payRes, eventRes] = await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true }).eq("unread_by_admin", true),
      supabase
        .from("party_builds")
        .select("id", { count: "exact", head: true })
        .in("status", ["saved", "quotation_requested"]),
      supabase
        .from("payments")
        .select("id", { count: "exact", head: true })
        .is("paid_at", null),
      supabase
        .from("admin_events")
        .select("id", { count: "exact", head: true })
        .gte("start_time", now)
        .lte("start_time", weekAhead),
    ]);

    return {
      newMessages: convRes.count ?? 0,
      pendingConcepts: conceptRes.count ?? 0,
      openPayments: payRes.count ?? 0,
      upcomingEvents: eventRes.count ?? 0,
    };
  },

  async getCategories() {
    if (!supabase) return [];
    const { data } = await supabase
      .from("component_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    return data || [];
  },

  async getComponents(categoryId?: string) {
    if (!supabase) return [];
    let query = supabase
      .from("party_components")
      .select("*, component_media(*)")
      .order("sort_order", { ascending: true });
    if (categoryId) query = query.eq("category_id", categoryId);
    const { data } = await query;
    return data || [];
  },

  async createComponent(component: {
    name: string;
    category_id: string;
    base_price: number;
    pricing_unit: string;
    description?: string;
    vat_rate?: number;
    price_includes_vat?: boolean;
    requires_large_bus?: boolean;
    requires_consultation?: boolean;
    minimum_quantity?: number;
    maximum_quantity?: number;
    dimensions?: string;
    indoor_outdoor?: string;
    sort_order?: number;
    key?: string;
  }): Promise<{ data: { id: string } | null; error: string | null }> {
    if (!supabase) return { data: null, error: "Not configured" };
    const { data: before } = await supabase
      .from("party_components")
      .select("*")
      .eq("key", component.key ?? "")
      .maybeSingle();
    if (before) return { data: null, error: "A component with this key already exists" };

    const { data, error } = await supabase
      .from("party_components")
      .insert({
        name: component.name,
        category_id: component.category_id,
        base_price: component.base_price,
        pricing_unit: component.pricing_unit,
        description: component.description ?? null,
        vat_rate: component.vat_rate ?? 21,
        price_includes_vat: component.price_includes_vat ?? true,
        requires_large_bus: component.requires_large_bus ?? false,
        requires_consultation: component.requires_consultation ?? false,
        minimum_quantity: component.minimum_quantity ?? 1,
        maximum_quantity: component.maximum_quantity ?? 100,
        dimensions: component.dimensions ?? null,
        indoor_outdoor: component.indoor_outdoor ?? null,
        sort_order: component.sort_order ?? 99,
        key: component.key ?? component.name.toLowerCase().replace(/\s+/g, "-"),
        is_active: true,
      })
      .select()
      .single();
    if (!error && data) {
      await logAudit("component_create", "party_components", data.id, undefined, { name: component.name });
    }
    return { data: data as { id: string } | null, error: error?.message ?? null };
  },

  async updateComponent(id: string, updates: Record<string, unknown>) {
    if (!supabase) return { error: "Not configured" };
    const { data: before } = await supabase
      .from("party_components")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase
      .from("party_components")
      .update(updates)
      .eq("id", id);
    if (!error) {
      await logAudit("component_update", "party_components", id, before as Record<string, unknown>, updates);
    }
    return { error: error?.message ?? null };
  },

  async deleteComponent(id: string) {
    if (!supabase) return { error: "Not configured" };
    const { data: before } = await supabase
      .from("party_components")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const { error } = await supabase
      .from("party_components")
      .delete()
      .eq("id", id);
    if (!error) {
      await logAudit("component_delete", "party_components", id, before as Record<string, unknown>);
    }
    return { error: error?.message ?? null };
  },

  async uploadComponentImage(componentId: string, file: File, isPrimary: boolean) {
    if (!supabase) return { error: "Not configured" };
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${componentId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("component-media")
      .upload(fileName, file, { contentType: file.type });
    if (uploadError) return { error: uploadError.message };
    const { data, error } = await supabase
      .from("component_media")
      .insert({
        component_id: componentId,
        storage_path: fileName,
        alt_text: file.name.replace(/\.[^/.]+$/, ""),
        is_primary: isPrimary,
        is_active: true,
        sort_order: 0,
      })
      .select()
      .single();
    if (!error && data) {
      await logAudit("component_media_upload", "component_media", data.id, undefined, { component_id: componentId });
    }
    return { data, error: error?.message ?? null };
  },

  async deleteComponentImage(mediaId: string, storagePath: string) {
    if (!supabase) return { error: "Not configured" };
    await supabase.storage.from("component-media").remove([storagePath]);
    const { error } = await supabase
      .from("component_media")
      .delete()
      .eq("id", mediaId);
    return { error: error?.message ?? null };
  },

  async uploadInspirationImage(postId: string, file: File, isCover: boolean) {
    if (!supabase) return { error: "Not configured" };
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${postId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("inspiration-media")
      .upload(fileName, file, { contentType: file.type });
    if (uploadError) return { error: uploadError.message };
    const { data, error } = await supabase
      .from("inspiration_media")
      .insert({
        post_id: postId,
        storage_path: fileName,
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        alt_text: file.name.replace(/\.[^/.]+$/, ""),
        is_cover: isCover,
        sort_order: 0,
      })
      .select()
      .single();
    return { data, error: error?.message ?? null };
  },

  async deleteInspirationImage(mediaId: string, storagePath: string) {
    if (!supabase) return { error: "Not configured" };
    await supabase.storage.from("inspiration-media").remove([storagePath]);
    const { error } = await supabase
      .from("inspiration_media")
      .delete()
      .eq("id", mediaId);
    return { error: error?.message ?? null };
  },

  async uploadThemeCover(themeId: string, file: File) {
    if (!supabase) return { error: "Not configured" };
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `themes/${themeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("inspiration-media")
      .upload(fileName, file, { contentType: file.type });
    if (uploadError) return { error: uploadError.message };
    const { error } = await adminApi.updateTheme(themeId, { cover_image_path: fileName });
    return { data: fileName, error };
  },

  async getAllMedia() {
    if (!supabase) return [];
    const { data } = await supabase
      .from("inspiration_media")
      .select("*, inspiration_posts!inner(title)")
      .order("created_at", { ascending: false })
      .limit(100);
    return data || [];
  },

  async createInspirationPost(post: {
    title: string;
    description?: string;
    color_tags?: string[];
  }): Promise<{ data: { id: string } | null; error: string | null }> {
    if (!supabase) return { data: null, error: "Not configured" };
    const { data: user } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("inspiration_posts")
      .insert({
        title: post.title,
        description: post.description ?? null,
        color_tags: post.color_tags ?? [],
        status: "draft",
        created_by: user.user?.id ?? null,
      })
      .select()
      .single();
    if (!error && data) {
      await logAudit("content_create", "inspiration_posts", data.id, undefined, { title: post.title });
    }
    return { data: data as { id: string } | null, error: error?.message ?? null };
  },

  async deleteInspirationPost(id: string) {
    if (!supabase) return { error: "Not configured" };
    const { error } = await supabase
      .from("inspiration_posts")
      .delete()
      .eq("id", id);
    if (!error) {
      await logAudit("content_delete", "inspiration_posts", id);
    }
    return { error: error?.message ?? null };
  },
};
