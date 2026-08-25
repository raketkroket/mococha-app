-- Admin content management: RLS for party_components, component_categories, component_media
-- + storage bucket for component images

-- ============================================================
-- component_categories: staff can manage
-- ============================================================
ALTER TABLE component_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cat_select_all" ON component_categories;
CREATE POLICY "cat_select_all"
  ON component_categories FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "cat_insert_staff" ON component_categories;
CREATE POLICY "cat_insert_staff"
  ON component_categories FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "cat_update_staff" ON component_categories;
CREATE POLICY "cat_update_staff"
  ON component_categories FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "cat_delete_staff" ON component_categories;
CREATE POLICY "cat_delete_staff"
  ON component_categories FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('content_manager'));

-- ============================================================
-- party_components: staff can manage
-- ============================================================
ALTER TABLE party_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pc_select_active" ON party_components;
CREATE POLICY "pc_select_active"
  ON party_components FOR SELECT TO anon, authenticated
  USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS "pc_insert_staff" ON party_components;
CREATE POLICY "pc_insert_staff"
  ON party_components FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "pc_update_staff" ON party_components;
CREATE POLICY "pc_update_staff"
  ON party_components FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "pc_delete_staff" ON party_components;
CREATE POLICY "pc_delete_staff"
  ON party_components FOR DELETE TO authenticated
  USING (public.has_role('admin') OR public.has_role('content_manager'));

-- ============================================================
-- component_media: staff can manage (existing read policy stays)
-- ============================================================
DROP POLICY IF EXISTS "insert_component_media" ON component_media;
CREATE POLICY "insert_component_media"
  ON component_media FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "update_component_media" ON component_media;
CREATE POLICY "update_component_media"
  ON component_media FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "delete_component_media" ON component_media;
CREATE POLICY "delete_component_media"
  ON component_media FOR DELETE TO authenticated
  USING (public.is_staff());

-- ============================================================
-- Storage bucket for component images
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('component-media', 'component-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "component_media_read" ON storage.objects;
CREATE POLICY "component_media_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'component-media');

DROP POLICY IF EXISTS "component_media_upload" ON storage.objects;
CREATE POLICY "component_media_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'component-media' AND public.is_staff());

DROP POLICY IF EXISTS "component_media_update_obj" ON storage.objects;
CREATE POLICY "component_media_update_obj"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'component-media' AND public.is_staff())
  WITH CHECK (bucket_id = 'component-media' AND public.is_staff());

DROP POLICY IF EXISTS "component_media_delete_obj" ON storage.objects;
CREATE POLICY "component_media_delete_obj"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'component-media' AND public.is_staff());

-- Also allow staff to upload to inspiration-media bucket (already has read policy)
-- The existing inspiration_media_upload policy already covers this via is_staff()
