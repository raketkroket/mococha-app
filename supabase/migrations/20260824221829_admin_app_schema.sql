/*
# MOCOCHA Admin App Schema

## Overview
Extends the platform with admin/staff infrastructure: role-based access control,
audit logging, inspiration management, theme management, prepared replies,
quotation management, events, and email logging.

## New Tables
1. staff_roles — user-to-role mapping (owner, admin, stylist, customer_service, finance, content_manager)
2. audit_logs — immutable admin action records
3. inspiration_posts — admin-managed inspiration gallery entries
4. inspiration_media — media items for inspiration posts
5. admin_themes — theme definitions with color palettes
6. prepared_replies — reusable canned replies
7. admin_quotations — formal quotations (renamed from quotations to avoid conflict with existing table)
8. admin_quotation_items — quotation line items
9. admin_events — calendar/agenda entries
10. email_log — outgoing email records

## Security
- RLS on all tables, staff-only access via is_staff() / has_role() helpers
- audit_logs and email_log are insert-only (no delete)
- inspiration-media storage bucket (public read, staff-only write)
*/

-- ============================================================
-- 1. staff_roles (must exist before helper functions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN ('owner', 'admin', 'stylist', 'customer_service', 'finance', 'content_manager')
  ),
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE user_id = auth.uid() AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_roles
    WHERE user_id = auth.uid() AND is_active = true
    AND (role = required_role OR role = 'owner')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('admin');
$$;

-- staff_roles policies
DROP POLICY IF EXISTS "staff_select_own_or_staff" ON public.staff_roles;
CREATE POLICY "staff_select_own_or_staff"
  ON public.staff_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "staff_insert_manage_only" ON public.staff_roles;
CREATE POLICY "staff_insert_manage_only"
  ON public.staff_roles FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_staff());

DROP POLICY IF EXISTS "staff_update_manage_only" ON public.staff_roles;
CREATE POLICY "staff_update_manage_only"
  ON public.staff_roles FOR UPDATE TO authenticated
  USING (public.can_manage_staff()) WITH CHECK (public.can_manage_staff());

DROP POLICY IF EXISTS "staff_delete_manage_only" ON public.staff_roles;
CREATE POLICY "staff_delete_manage_only"
  ON public.staff_roles FOR DELETE TO authenticated
  USING (public.can_manage_staff());

-- ============================================================
-- 2. audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_staff" ON public.audit_logs;
CREATE POLICY "audit_select_staff"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "audit_insert_staff" ON public.audit_logs;
CREATE POLICY "audit_insert_staff"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON public.audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- 3. inspiration_posts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inspiration_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  party_type_id uuid,
  theme_id uuid,
  color_tags text[] DEFAULT '{}',
  cover_media_id uuid,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'scheduled', 'archived')
  ),
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspiration_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insp_select_published_or_staff" ON public.inspiration_posts;
CREATE POLICY "insp_select_published_or_staff"
  ON public.inspiration_posts FOR SELECT TO anon, authenticated
  USING (status = 'published' OR public.is_staff());

DROP POLICY IF EXISTS "insp_insert_staff" ON public.inspiration_posts;
CREATE POLICY "insp_insert_staff"
  ON public.inspiration_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "insp_update_staff" ON public.inspiration_posts;
CREATE POLICY "insp_update_staff"
  ON public.inspiration_posts FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "insp_delete_staff" ON public.inspiration_posts;
CREATE POLICY "insp_delete_staff"
  ON public.inspiration_posts FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('content_manager'));

CREATE INDEX IF NOT EXISTS idx_insp_status ON public.inspiration_posts(status);
CREATE INDEX IF NOT EXISTS idx_insp_featured ON public.inspiration_posts(is_featured) WHERE is_featured = true;

-- ============================================================
-- 4. inspiration_media
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inspiration_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.inspiration_posts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  thumbnail_path text,
  card_path text,
  gallery_path text,
  original_filename text,
  mime_type text,
  file_size bigint,
  width int,
  height int,
  alt_text text,
  sort_order int NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  focal_x float DEFAULT 0.5,
  focal_y float DEFAULT 0.5,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inspiration_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insp_media_select" ON public.inspiration_media;
CREATE POLICY "insp_media_select"
  ON public.inspiration_media FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.inspiration_posts
      WHERE inspiration_posts.id = inspiration_media.post_id
      AND (inspiration_posts.status = 'published' OR public.is_staff()))
  );

DROP POLICY IF EXISTS "insp_media_insert_staff" ON public.inspiration_media;
CREATE POLICY "insp_media_insert_staff"
  ON public.inspiration_media FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "insp_media_update_staff" ON public.inspiration_media;
CREATE POLICY "insp_media_update_staff"
  ON public.inspiration_media FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "insp_media_delete_staff" ON public.inspiration_media;
CREATE POLICY "insp_media_delete_staff"
  ON public.inspiration_media FOR DELETE TO authenticated
  USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_insp_media_post ON public.inspiration_media(post_id, sort_order);

-- ============================================================
-- 5. admin_themes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  color_palette jsonb DEFAULT '[]',
  cover_image_path text,
  sort_order int NOT NULL DEFAULT 0,
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  linked_backdrops jsonb DEFAULT '[]',
  linked_play_items jsonb DEFAULT '[]',
  linked_decoration jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_themes_select" ON public.admin_themes;
CREATE POLICY "admin_themes_select"
  ON public.admin_themes FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.is_staff());

DROP POLICY IF EXISTS "admin_themes_insert_staff" ON public.admin_themes;
CREATE POLICY "admin_themes_insert_staff"
  ON public.admin_themes FOR INSERT TO authenticated
  WITH CHECK (public.has_role('admin') OR public.has_role('content_manager'));

DROP POLICY IF EXISTS "admin_themes_update_staff" ON public.admin_themes;
CREATE POLICY "admin_themes_update_staff"
  ON public.admin_themes FOR UPDATE TO authenticated
  USING (public.has_role('admin') OR public.has_role('content_manager'))
  WITH CHECK (public.has_role('admin') OR public.has_role('content_manager'));

DROP POLICY IF EXISTS "admin_themes_delete_staff" ON public.admin_themes;
CREATE POLICY "admin_themes_delete_staff"
  ON public.admin_themes FOR DELETE TO authenticated
  USING (public.has_role('admin'));

-- ============================================================
-- 6. prepared_replies
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prepared_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prepared_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "replies_select_staff" ON public.prepared_replies;
CREATE POLICY "replies_select_staff"
  ON public.prepared_replies FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "replies_insert_staff" ON public.prepared_replies;
CREATE POLICY "replies_insert_staff"
  ON public.prepared_replies FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "replies_update_staff" ON public.prepared_replies;
CREATE POLICY "replies_update_staff"
  ON public.prepared_replies FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "replies_delete_staff" ON public.prepared_replies;
CREATE POLICY "replies_delete_staff"
  ON public.prepared_replies FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('customer_service'));

-- ============================================================
-- 7. admin_quotations (renamed to avoid conflict with existing quotations table)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_build_id uuid REFERENCES public.party_builds(id) ON DELETE SET NULL,
  customer_email text,
  customer_name text,
  version int NOT NULL DEFAULT 1,
  parent_quotation_id uuid REFERENCES public.admin_quotations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'viewed', 'changes_requested', 'accepted', 'expired', 'withdrawn')
  ),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) DEFAULT 0,
  surcharge numeric(10,2) DEFAULT 0,
  transport_cost numeric(10,2) DEFAULT 0,
  extra_bus_cost numeric(10,2) DEFAULT 0,
  vat_total numeric(10,2) DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  deposit_percentage numeric(5,2) DEFAULT 30,
  deposit_amount numeric(10,2) DEFAULT 0,
  remaining_amount numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'EUR',
  internal_note text,
  customer_note text,
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_quot_select" ON public.admin_quotations;
CREATE POLICY "admin_quot_select"
  ON public.admin_quotations FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_quot_insert_staff" ON public.admin_quotations;
CREATE POLICY "admin_quot_insert_staff"
  ON public.admin_quotations FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "admin_quot_update_staff" ON public.admin_quotations;
CREATE POLICY "admin_quot_update_staff"
  ON public.admin_quotations FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "admin_quot_delete_staff" ON public.admin_quotations;
CREATE POLICY "admin_quot_delete_staff"
  ON public.admin_quotations FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('finance'));

CREATE INDEX IF NOT EXISTS idx_admin_quot_status ON public.admin_quotations(status);
CREATE INDEX IF NOT EXISTS idx_admin_quot_build ON public.admin_quotations(party_build_id);

-- ============================================================
-- 8. admin_quotation_items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.admin_quotations(id) ON DELETE CASCADE,
  component_id uuid,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  pricing_unit text DEFAULT 'one_time',
  vat_rate numeric(5,2) DEFAULT 21,
  line_total numeric(10,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  is_custom boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_quot_items_select" ON public.admin_quotation_items;
CREATE POLICY "admin_quot_items_select"
  ON public.admin_quotation_items FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR EXISTS (SELECT 1 FROM public.admin_quotations q
      WHERE q.id = quotation_id
      AND q.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

DROP POLICY IF EXISTS "admin_quot_items_insert_staff" ON public.admin_quotation_items;
CREATE POLICY "admin_quot_items_insert_staff"
  ON public.admin_quotation_items FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "admin_quot_items_update_staff" ON public.admin_quotation_items;
CREATE POLICY "admin_quot_items_update_staff"
  ON public.admin_quotation_items FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "admin_quot_items_delete_staff" ON public.admin_quotation_items;
CREATE POLICY "admin_quot_items_delete_staff"
  ON public.admin_quotation_items FOR DELETE TO authenticated
  USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_admin_quot_items_quot ON public.admin_quotation_items(quotation_id, sort_order);

-- ============================================================
-- 9. admin_events
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_build_id uuid REFERENCES public.party_builds(id) ON DELETE SET NULL,
  title text,
  event_type text,
  customer_name text,
  location text,
  city text,
  start_time timestamptz,
  end_time timestamptz,
  setup_time timestamptz,
  assigned_stylist uuid REFERENCES auth.users(id),
  requires_large_bus boolean DEFAULT false,
  delivery_notes text,
  status text DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_staff" ON public.admin_events;
CREATE POLICY "events_select_staff"
  ON public.admin_events FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "events_insert_staff" ON public.admin_events;
CREATE POLICY "events_insert_staff"
  ON public.admin_events FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "events_update_staff" ON public.admin_events;
CREATE POLICY "events_update_staff"
  ON public.admin_events FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "events_delete_staff" ON public.admin_events;
CREATE POLICY "events_delete_staff"
  ON public.admin_events FOR DELETE TO authenticated
  USING (public.has_role('admin'));

CREATE INDEX IF NOT EXISTS idx_events_start ON public.admin_events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_stylist ON public.admin_events(assigned_stylist);

-- ============================================================
-- 10. email_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text,
  template text,
  concept_id uuid,
  provider_message_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'sent', 'delivered', 'failed')
  ),
  error text,
  sent_by uuid REFERENCES auth.users(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_log_select_staff" ON public.email_log;
CREATE POLICY "email_log_select_staff"
  ON public.email_log FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "email_log_insert_staff" ON public.email_log;
CREATE POLICY "email_log_insert_staff"
  ON public.email_log FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "email_log_update_staff" ON public.email_log;
CREATE POLICY "email_log_update_staff"
  ON public.email_log FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_email_log_conv ON public.email_log(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON public.email_log(status);

-- ============================================================
-- Modify profiles table
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'staff_role') THEN
    ALTER TABLE public.profiles ADD COLUMN staff_role text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active_staff') THEN
    ALTER TABLE public.profiles ADD COLUMN is_active_staff boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- Modify conversations table
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'assigned_to') THEN
    ALTER TABLE public.conversations ADD COLUMN assigned_to uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'priority') THEN
    ALTER TABLE public.conversations ADD COLUMN priority text DEFAULT 'normal';
  END IF;
END $$;

-- ============================================================
-- Storage bucket for inspiration images
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('inspiration-media', 'inspiration-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "inspiration_media_read" ON storage.objects;
CREATE POLICY "inspiration_media_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'inspiration-media');

DROP POLICY IF EXISTS "inspiration_media_upload" ON storage.objects;
CREATE POLICY "inspiration_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'inspiration-media' AND public.is_staff());

DROP POLICY IF EXISTS "inspiration_media_update" ON storage.objects;
CREATE POLICY "inspiration_media_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'inspiration-media' AND public.is_staff())
  WITH CHECK (bucket_id = 'inspiration-media' AND public.is_staff());

DROP POLICY IF EXISTS "inspiration_media_delete" ON storage.objects;
CREATE POLICY "inspiration_media_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspiration-media' AND public.is_staff());

-- ============================================================
-- Seed staff_roles for existing admin users
-- ============================================================

INSERT INTO public.staff_roles (user_id, role, is_active)
SELECT id, 'owner', true FROM public.profiles WHERE is_admin = true
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- Trigger: sync staff_roles when is_admin is set
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_staff_role_from_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin = true THEN
    INSERT INTO public.staff_roles (user_id, role, is_active)
    VALUES (NEW.id, 'owner', true)
    ON CONFLICT (user_id) DO UPDATE SET is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_staff_role ON public.profiles;
CREATE TRIGGER profiles_sync_staff_role
  AFTER INSERT OR UPDATE OF is_admin ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_staff_role_from_admin();

-- ============================================================
-- Seed default prepared replies (Dutch)
-- ============================================================

INSERT INTO public.prepared_replies (title, body, category) VALUES
  ('Offerte ontvangen', 'Bedankt voor je aanvraag! We hebben je concept ontvangen en sturen je zo snel mogelijk een offerte. Heb je in de tussentijd vragen? Laat het ons gerust weten.', 'offerte'),
  ('Meer informatie nodig', 'Om je offerte zo compleet mogelijk te maken, hebben we nog wat extra informatie nodig. Kun je ons de volgende details doorgeven?', 'offerte'),
  ('Datum niet beschikbaar', 'Helaas is de door jou gekozen datum al volgeboekt. We hebben wel andere data beschikbaar in dezelfde periode. Zullen we samen kijken naar een geschikt alternatief?', 'offerte'),
  ('Aanbetaling nodig', 'Om je reservering definitief te maken, vragen we een aanbetaling van 30% van het totaalbedrag. Zodra deze is ontvangen, gaan we aan de slag met de voorbereidingen!', 'betaling'),
  ('Betaling ontvangen', 'We hebben je aanbetaling ontvangen. Je reservering is nu definitief bevestigd! We kijken ernaar uit om samen een prachtig feest te maken.', 'betaling'),
  ('Transport wordt gecontroleerd', 'We zijn momenteel de transportmogelijkheden voor jouw locatie aan het controleren. Zo snel mogelijk laten we je weten of er een extra bus nodig is.', 'transport'),
  ('Concept goedgekeurd', 'Je concept is goedgekeurd! We gaan nu verder met de voorbereiding. Je ontvangt binnenkort een update over de styling en planning.', 'concept'),
  ('Styling in voorbereiding', 'Ons team is momenteel bezig met de styling en voorbereiding van je feest. We houden je op de hoogte van de voortgang!', 'concept')
ON CONFLICT DO NOTHING;

-- ============================================================
-- updated_at triggers
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_staff_roles_updated ON public.staff_roles;
CREATE TRIGGER trg_staff_roles_updated BEFORE UPDATE ON public.staff_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_insp_posts_updated ON public.inspiration_posts;
CREATE TRIGGER trg_insp_posts_updated BEFORE UPDATE ON public.inspiration_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_admin_themes_updated ON public.admin_themes;
CREATE TRIGGER trg_admin_themes_updated BEFORE UPDATE ON public.admin_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_prepared_replies_updated ON public.prepared_replies;
CREATE TRIGGER trg_prepared_replies_updated BEFORE UPDATE ON public.prepared_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_admin_quotations_updated ON public.admin_quotations;
CREATE TRIGGER trg_admin_quotations_updated BEFORE UPDATE ON public.admin_quotations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_admin_events_updated ON public.admin_events;
CREATE TRIGGER trg_admin_events_updated BEFORE UPDATE ON public.admin_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
