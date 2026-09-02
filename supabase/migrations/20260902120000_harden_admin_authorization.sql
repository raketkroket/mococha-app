-- Make staff_roles the sole source of authority for all admin access.

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = auth.uid() AND is_active = true
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
    SELECT 1
    FROM public.staff_roles
    WHERE user_id = auth.uid()
      AND is_active = true
      AND (role = required_role OR role = 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role('owner');
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated'
    AND (NEW.is_admin IS DISTINCT FROM OLD.is_admin
      OR NEW.is_active_staff IS DISTINCT FROM OLD.is_active_staff
      OR NEW.staff_role IS DISTINCT FROM OLD.staff_role) THEN
    RAISE EXCEPTION 'Profile privileges cannot be changed by users';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_changes ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_changes
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_changes();

DROP TRIGGER IF EXISTS profiles_sync_staff_role ON public.profiles;

-- Existing legacy admins retain access through the protected role table.
INSERT INTO public.staff_roles (user_id, role, is_active)
SELECT id, 'owner', true
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id) DO NOTHING;

-- Initial provisioning only. This is not used for runtime authorization.
INSERT INTO public.staff_roles (user_id, role, is_active)
SELECT id, 'owner', true
FROM auth.users
WHERE lower(email) = 'info@mococha.nl'
ON CONFLICT (user_id) DO UPDATE SET role = 'owner', is_active = true;

DROP POLICY IF EXISTS "admin_select_contact_messages" ON public.contact_messages;
CREATE POLICY "admin_select_contact_messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "admin_update_contact_messages" ON public.contact_messages;
CREATE POLICY "admin_update_contact_messages"
  ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "select_own_conversations" ON public.conversations;
CREATE POLICY "select_own_conversations" ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "update_own_conversations" ON public.conversations;
CREATE POLICY "update_own_conversations" ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_staff())
  WITH CHECK (auth.uid() = user_id OR public.is_staff());

DROP POLICY IF EXISTS "select_conversation_messages" ON public.conversation_messages;
CREATE POLICY "select_conversation_messages" ON public.conversation_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
      AND (conversations.user_id = auth.uid() OR public.is_staff())
  ));

DROP POLICY IF EXISTS "insert_conversation_messages" ON public.conversation_messages;
CREATE POLICY "insert_conversation_messages" ON public.conversation_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
      AND (conversations.user_id = auth.uid() OR public.is_staff())
  ));

DROP POLICY IF EXISTS "update_conversation_messages" ON public.conversation_messages;
CREATE POLICY "update_conversation_messages" ON public.conversation_messages FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
      AND (conversations.user_id = auth.uid() OR public.is_staff())
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
      AND (conversations.user_id = auth.uid() OR public.is_staff())
  ));

DROP POLICY IF EXISTS "admin_write_app_settings" ON public.app_settings;
CREATE POLICY "admin_write_app_settings" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role('owner')) WITH CHECK (public.has_role('owner'));

DROP POLICY IF EXISTS "Admins can read all attachments" ON storage.objects;
CREATE POLICY "Admins can read all attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-attachments' AND public.is_staff());