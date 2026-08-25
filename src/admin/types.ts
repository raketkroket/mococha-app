export type StaffRole =
  | "owner"
  | "admin"
  | "stylist"
  | "customer_service"
  | "finance"
  | "content_manager";

export interface StaffMember {
  id: string;
  user_id: string;
  role: StaffRole;
  is_active: boolean;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  full_name?: string;
}

export interface AuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
  admin_email?: string;
}

export interface InspirationPost {
  id: string;
  title: string;
  description: string | null;
  party_type_id: string | null;
  theme_id: string | null;
  color_tags: string[];
  cover_media_id: string | null;
  status: "draft" | "published" | "scheduled" | "archived";
  is_featured: boolean;
  published_at: string | null;
  scheduled_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  media?: InspirationMedia[];
}

export interface InspirationMedia {
  id: string;
  post_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  card_path: string | null;
  gallery_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  sort_order: number;
  is_cover: boolean;
  focal_x: number;
  focal_y: number;
  created_at: string;
}

export interface AdminTheme {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  color_palette: string[];
  cover_image_path: string | null;
  sort_order: number;
  is_featured: boolean;
  is_published: boolean;
  linked_backdrops: string[];
  linked_play_items: string[];
  linked_decoration: string[];
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface PreparedReply {
  id: string;
  title: string;
  body: string;
  category: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminQuotation {
  id: string;
  party_build_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  version: number;
  parent_quotation_id: string | null;
  status:
    | "draft"
    | "sent"
    | "viewed"
    | "changes_requested"
    | "accepted"
    | "expired"
    | "withdrawn";
  subtotal: number;
  discount: number;
  surcharge: number;
  transport_cost: number;
  extra_bus_cost: number;
  vat_total: number;
  total: number;
  deposit_percentage: number;
  deposit_amount: number;
  remaining_amount: number;
  currency: string;
  internal_note: string | null;
  customer_note: string | null;
  expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
  items?: AdminQuotationItem[];
}

export interface AdminQuotationItem {
  id: string;
  quotation_id: string;
  component_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  pricing_unit: string;
  vat_rate: number;
  line_total: number;
  sort_order: number;
  is_custom: boolean;
  created_at: string;
}

export interface AdminEvent {
  id: string;
  party_build_id: string | null;
  title: string | null;
  event_type: string | null;
  customer_name: string | null;
  location: string | null;
  city: string | null;
  start_time: string | null;
  end_time: string | null;
  setup_time: string | null;
  assigned_stylist: string | null;
  requires_large_bus: boolean;
  delivery_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  conversation_id: string | null;
  recipient: string;
  subject: string;
  body: string | null;
  template: string | null;
  concept_id: string | null;
  provider_message_id: string | null;
  status: "pending" | "sent" | "delivered" | "failed";
  error: string | null;
  sent_by: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface AdminConversation {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  concept_id: string | null;
  status: string;
  last_message_at: string | null;
  unread_by_user: boolean;
  unread_by_admin: boolean;
  assigned_to: string | null;
  priority: string;
  created_at: string;
  updated_at: string;
  customer_email?: string;
  customer_name?: string;
  last_message_preview?: string;
}

export interface AdminConcept {
  id: string;
  user_id: string | null;
  reference_number: string | null;
  name: string | null;
  status: string;
  build_mode: string;
  event_data: Record<string, unknown> | null;
  theme_data: Record<string, unknown> | null;
  pricing_snapshot: Record<string, unknown> | null;
  subtotal_gross: number | null;
  vat_portion: number | null;
  total_gross: number | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  customer_email?: string;
}

export const ROLE_LABELS: Record<StaffRole, { nl: string; en: string }> = {
  owner: { nl: "Eigenaar", en: "Owner" },
  admin: { nl: "Beheerder", en: "Admin" },
  stylist: { nl: "Stylist", en: "Stylist" },
  customer_service: { nl: "Klantenservice", en: "Customer Service" },
  finance: { nl: "Financiën", en: "Finance" },
  content_manager: { nl: "Contentbeheerder", en: "Content Manager" },
};

export const ROLE_PERMISSIONS: Record<StaffRole, string[]> = {
  owner: [
    "staff.manage",
    "settings.manage",
    "concepts.manage",
    "content.manage",
    "messages.manage",
    "quotations.manage",
    "payments.manage",
    "events.manage",
    "audit.view",
    "integrations.view",
  ],
  admin: [
    "concepts.manage",
    "content.manage",
    "messages.manage",
    "quotations.manage",
    "payments.manage",
    "events.manage",
    "audit.view",
    "integrations.view",
  ],
  stylist: ["concepts.view", "events.view", "content.view", "inspiration.upload"],
  customer_service: ["messages.manage", "concepts.view", "customers.view"],
  finance: ["quotations.manage", "payments.manage", "concepts.view"],
  content_manager: ["content.manage", "inspiration.manage", "themes.manage"],
};

export function hasPermission(role: StaffRole | null, permission: string): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}
