/*
# Premium Experience Schema Extension

## Summary
Extends the existing MOCOCHA schema to support: complete profiles with avatar/theme/notification preferences, in-app contact messaging with concept linking, concept reference numbers, notification architecture, and app settings storage.

## New Tables
1. `contact_messages` — In-app contact form submissions from customers
2. `app_notifications` — In-app notification architecture for future push/email
3. `app_settings` — Admin-configurable app settings (contact info, URLs, feature flags)

## Modified Tables
1. `profiles` — Added columns: avatar_path, preferred_language, preferred_theme, notification_preferences (JSONB), email_verified, updated_at trigger

## Security
- RLS enabled on all new tables
- Owner-scoped policies on contact_messages and app_notifications
- Admin-only read/write on app_settings via is_admin check
- profile-avatars storage bucket with owner-scoped RLS
*/

-- ============================================================
-- 0. updated_at helper function (create first, before triggers)
-- ============================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. Extend profiles table
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_path') THEN
    ALTER TABLE profiles ADD COLUMN avatar_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_language') THEN
    ALTER TABLE profiles ADD COLUMN preferred_language text DEFAULT 'nl';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_theme') THEN
    ALTER TABLE profiles ADD COLUMN preferred_theme text DEFAULT 'system';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notification_preferences') THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences jsonb DEFAULT '{"push":true,"email":true,"marketing":false,"concept_updates":true,"payment_updates":true,"event_reminders":true}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email_verified') THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- 2. contact_messages table
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  reply_email text NOT NULL,
  concept_id uuid,
  consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  admin_reply text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_contact_messages" ON contact_messages;
CREATE POLICY "select_own_contact_messages"
  ON contact_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_contact_messages" ON contact_messages;
CREATE POLICY "insert_own_contact_messages"
  ON contact_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_contact_messages" ON contact_messages;
CREATE POLICY "update_own_contact_messages"
  ON contact_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_select_contact_messages" ON contact_messages;
CREATE POLICY "admin_select_contact_messages"
  ON contact_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

DROP POLICY IF EXISTS "admin_update_contact_messages" ON contact_messages;
CREATE POLICY "admin_update_contact_messages"
  ON contact_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- ============================================================
-- 3. app_notifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON app_notifications;
CREATE POLICY "select_own_notifications"
  ON app_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON app_notifications;
CREATE POLICY "insert_own_notifications"
  ON app_notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON app_notifications;
CREATE POLICY "update_own_notifications"
  ON app_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON app_notifications;
CREATE POLICY "delete_own_notifications"
  ON app_notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON app_notifications(user_id) WHERE read = false;

-- ============================================================
-- 4. app_settings table (admin-configurable)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_app_settings" ON app_settings;
CREATE POLICY "read_app_settings"
  ON app_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_app_settings" ON app_settings;
CREATE POLICY "admin_write_app_settings"
  ON app_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

INSERT INTO app_settings (key, value, description) VALUES
  ('instagram_url', '"https://www.instagram.com/mococha_events/"', 'Instagram profile URL'),
  ('contact_email', '"info@mococha.nl"', 'Primary contact email'),
  ('terms_url', '"/info/algemene-voorwaarden"', 'Terms and conditions URL'),
  ('privacy_url', '"/info/privacy"', 'Privacy policy URL'),
  ('app_version', '"1.0.0"', 'Current app version'),
  ('company_city', '"Almere, Nederland"', 'Company location display text')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 5. Concept reference number column + sequence
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'party_builds' AND column_name = 'reference_number') THEN
    ALTER TABLE party_builds ADD COLUMN reference_number text;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS concept_reference_seq START 1;

-- ============================================================
-- 6. Storage bucket for profile avatars
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('profile-avatars', 'profile-avatars', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_select_own" ON storage.objects;
CREATE POLICY "avatar_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_insert_own" ON storage.objects;
CREATE POLICY "avatar_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 7. Helper function: generate concept reference
-- ============================================================

CREATE OR REPLACE FUNCTION generate_concept_reference()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 'MOC-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('concept_reference_seq')::text, 5, '0');
$$;
