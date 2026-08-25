/*
# Build Your Party — Schema repair and extension

Adds missing columns to existing tables and creates new tables.
Does NOT drop or rename existing columns — only adds new ones.

## Changes to existing tables

### party_components
- Add: key text (unique component identifier for seeding)
- Add: updated_at timestamptz

### party_builds  
- Add: name, build_mode, current_step, event_data, theme_data, pricing_snapshot
- Add: subtotal_gross, vat_portion, total_gross, deposit_amount, remaining_amount
- Add: submitted_at, deleted_at, guest_token_hash

### party_build_selections
- Add: component_id, title_snapshot, unit_price_snapshot, pricing_unit, line_total
- Add: price_includes_vat, updated_at

### payments
- Add: party_build_id, payment_type, currency, webhook_verified_at, paid_at, updated_at

## New tables
- component_media (images per component)
- party_build_media (customer inspiration uploads)
- party_notifications

## RLS
- component_media: public read
- party_build_media: owner/guest scoped
- party_notifications: owner-scoped

## Seed data
- 17 component categories with step_key
- 70+ components with correct pricing_unit and VAT-inclusive prices
*/

-- ============================================================
-- ADD MISSING COLUMNS
-- ============================================================

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_components' AND column_name='key') THEN ALTER TABLE party_components ADD COLUMN key text; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_components' AND column_name='updated_at') THEN ALTER TABLE party_components ADD COLUMN updated_at timestamptz DEFAULT now(); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='name') THEN ALTER TABLE party_builds ADD COLUMN name text; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='build_mode') THEN ALTER TABLE party_builds ADD COLUMN build_mode text DEFAULT 'self'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='current_step') THEN ALTER TABLE party_builds ADD COLUMN current_step integer DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='event_data') THEN ALTER TABLE party_builds ADD COLUMN event_data jsonb DEFAULT '{}'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='theme_data') THEN ALTER TABLE party_builds ADD COLUMN theme_data jsonb DEFAULT '{}'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='pricing_snapshot') THEN ALTER TABLE party_builds ADD COLUMN pricing_snapshot jsonb DEFAULT '{}'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='subtotal_gross') THEN ALTER TABLE party_builds ADD COLUMN subtotal_gross numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='vat_portion') THEN ALTER TABLE party_builds ADD COLUMN vat_portion numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='total_gross') THEN ALTER TABLE party_builds ADD COLUMN total_gross numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='deposit_amount') THEN ALTER TABLE party_builds ADD COLUMN deposit_amount numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='remaining_amount') THEN ALTER TABLE party_builds ADD COLUMN remaining_amount numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='submitted_at') THEN ALTER TABLE party_builds ADD COLUMN submitted_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='deleted_at') THEN ALTER TABLE party_builds ADD COLUMN deleted_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_builds' AND column_name='guest_token_hash') THEN ALTER TABLE party_builds ADD COLUMN guest_token_hash text; END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='component_id') THEN ALTER TABLE party_build_selections ADD COLUMN component_id uuid; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='title_snapshot') THEN ALTER TABLE party_build_selections ADD COLUMN title_snapshot text; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='unit_price_snapshot') THEN ALTER TABLE party_build_selections ADD COLUMN unit_price_snapshot numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='pricing_unit') THEN ALTER TABLE party_build_selections ADD COLUMN pricing_unit text DEFAULT 'one_time'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='line_total') THEN ALTER TABLE party_build_selections ADD COLUMN line_total numeric DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='price_includes_vat') THEN ALTER TABLE party_build_selections ADD COLUMN price_includes_vat boolean DEFAULT true; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='party_build_selections' AND column_name='updated_at') THEN ALTER TABLE party_build_selections ADD COLUMN updated_at timestamptz DEFAULT now(); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='party_build_id') THEN ALTER TABLE payments ADD COLUMN party_build_id uuid; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='payment_type') THEN ALTER TABLE payments ADD COLUMN payment_type text DEFAULT 'deposit'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='currency') THEN ALTER TABLE payments ADD COLUMN currency text DEFAULT 'EUR'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='webhook_verified_at') THEN ALTER TABLE payments ADD COLUMN webhook_verified_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='paid_at') THEN ALTER TABLE payments ADD COLUMN paid_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payments' AND column_name='updated_at') THEN ALTER TABLE payments ADD COLUMN updated_at timestamptz DEFAULT now(); END IF; END $$;

-- ============================================================
-- NEW TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS component_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid REFERENCES party_components(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text text,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_build_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party_build_id uuid REFERENCES party_builds(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  thumbnail_path text,
  original_filename text,
  mime_type text,
  file_size bigint,
  alt_text text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  body text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pc_key ON party_components(key);
CREATE INDEX IF NOT EXISTS idx_pb_user ON party_builds(user_id);
CREATE INDEX IF NOT EXISTS idx_pb_guest ON party_builds(guest_token_hash);
CREATE INDEX IF NOT EXISTS idx_pbs_build ON party_build_selections(build_id);
CREATE INDEX IF NOT EXISTS idx_pbm_build ON party_build_media(party_build_id);
CREATE INDEX IF NOT EXISTS idx_pay_build ON payments(party_build_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE component_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_build_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_component_media" ON component_media;
CREATE POLICY "read_component_media" ON component_media FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "read_build_media" ON party_build_media;
CREATE POLICY "read_build_media" ON party_build_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM party_builds WHERE party_builds.id = party_build_media.party_build_id AND (party_builds.user_id = auth.uid() OR (party_builds.user_id IS NULL AND party_builds.guest_token_hash IS NOT NULL))));
DROP POLICY IF EXISTS "insert_build_media" ON party_build_media;
CREATE POLICY "insert_build_media" ON party_build_media FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM party_builds WHERE party_builds.id = party_build_media.party_build_id AND (party_builds.user_id = auth.uid() OR (party_builds.user_id IS NULL AND party_builds.guest_token_hash IS NOT NULL))));
DROP POLICY IF EXISTS "delete_build_media" ON party_build_media;
CREATE POLICY "delete_build_media" ON party_build_media FOR DELETE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM party_builds WHERE party_builds.id = party_build_media.party_build_id AND (party_builds.user_id = auth.uid() OR (party_builds.user_id IS NULL AND party_builds.guest_token_hash IS NOT NULL))));

DROP POLICY IF EXISTS "read_notifications" ON party_notifications;
CREATE POLICY "read_notifications" ON party_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_notifications" ON party_notifications;
CREATE POLICY "insert_notifications" ON party_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_notifications" ON party_notifications;
CREATE POLICY "update_notifications" ON party_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SEED CATEGORIES
-- ============================================================
INSERT INTO component_categories (step_key, title, sort_order)
SELECT * FROM (VALUES
  ('service', 'Service', 1), ('backdrop', 'Backdrop', 2), ('backdrop-addon', 'Backdrop extra''s', 3),
  ('play', 'Speel items', 4), ('tables', 'Kindertafels', 5),
  ('tables-per-table', 'Tafel extra''s (per tafel)', 6), ('tables-per-child', 'Tafel extra''s (per kind)', 7),
  ('favours', 'Bedankjes', 8), ('favour-content', 'Emmertje inhoud', 9),
  ('entertainment', 'Entertainment', 10),
  ('decoration-balloons', 'Ballonnen', 11), ('decoration-flowers', 'Bloemen', 12), ('decoration', 'Overige decoratie', 13),
  ('entrance-board', 'Welkomstbord', 14), ('entrance-arch', 'Ballonnenboog / tunnel', 15),
  ('entrance-cutouts', 'Cutouts', 16), ('entrance-floor', 'Gepersonaliseerde vloer', 17)
) AS v(step_key, title, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM component_categories WHERE component_categories.step_key = v.step_key);

-- ============================================================
-- SEED COMPONENTS
-- ============================================================
INSERT INTO party_components (category_id, key, name, base_price, pricing_unit, price_includes_vat, requires_large_bus, sort_order, is_active)
SELECT cat.id, v.key, v.name, v.base_price, v.pricing_unit, v.inc, v.bus, v.so, true
FROM (VALUES
  ('service','delivery','Bezorging',45,'one_time',true,false,1),
  ('service','delivery-setup','Bezorging met op- en afbouw',125,'one_time',true,false,2),
  ('backdrop','small','Small backdrop',125,'one_time',true,false,1),
  ('backdrop','medium','Medium backdrop',175,'one_time',true,false,2),
  ('backdrop','large','Large backdrop',245,'one_time',true,false,3),
  ('backdrop','xl','Extra Large backdrop',345,'one_time',true,false,4),
  ('backdrop','xxl','XXL backdrop setting',445,'one_time',true,false,5),
  ('backdrop','platinum','MOCOCHA Platinum',525,'one_time',true,false,6),
  ('backdrop-addon','plexi','Plexiglas naam',45,'one_time',true,false,1),
  ('backdrop-addon','podium','Podium',65,'one_time',true,false,2),
  ('backdrop-addon','cutouts','Cutouts',35,'one_time',true,false,3),
  ('backdrop-addon','fresh-flower-pack','Verse bloemen pakket',95,'one_time',true,false,4),
  ('backdrop-addon','artificial-flower-pack','Kunstbloemen pakket',65,'one_time',true,false,5),
  ('backdrop-addon','floor-200','Vloerprint 200×200 cm',120,'one_time',true,false,6),
  ('backdrop-addon','floor-300','Vloerprint 300×300 cm',150,'one_time',true,false,7),
  ('backdrop-addon','floor-600','Vloerprint 600×300 cm',200,'one_time',true,false,8),
  ('play','softplay','Softplay',165,'one_time',true,true,1),
  ('play','ballenbak','Ballenbak',195,'one_time',true,true,2),
  ('play','springkussen','Springkussen',145,'one_time',true,true,3),
  ('play','sb','Softplay met ballenbak',295,'one_time',true,true,4),
  ('play','ss','Softplay met springkussen',265,'one_time',true,true,5),
  ('play','pg','Complete playground',395,'one_time',true,true,6),
  ('play','bc','Bumper cars',450,'one_time',true,true,7),
  ('tables','only','Tafels en stoelen',22.5,'per_table',true,false,1),
  ('tables','basic','Basic styling',45,'per_table',true,false,2),
  ('tables','full','Volledig gestylde kindertafels',95,'per_table',true,false,3),
  ('tables','cloth','Tafelkleden',12.5,'per_table',true,false,4),
  ('tables','balloons','Ballonnen op de kindertafel',35,'per_table',true,false,5),
  ('tables-per-table','centerpieces','Centerpieces',12.5,'per_table',true,false,1),
  ('tables-per-table','table-flowers','Tafelbloemen',18.5,'per_table',true,false,2),
  ('tables-per-table','theme-props','Thema props',15,'per_table',true,false,3),
  ('tables-per-child','placemats','Placemats',3.95,'per_child',true,false,1),
  ('tables-per-child','cups','Bekers',2.5,'per_child',true,false,2),
  ('tables-per-child','plates','Borden',2.95,'per_child',true,false,3),
  ('tables-per-child','napkins','Servetten',1.95,'per_child',true,false,4),
  ('tables-per-child','chair-deco','Stoeldecoratie',4.5,'per_child',true,false,5),
  ('favours','none','Zonder bedankjes',0,'per_child',true,false,1),
  ('favours','empty-box','Bedankdoosje leeg',3.75,'per_child',true,false,2),
  ('favours','sweet-box','Bedankdoosje met snoep',4.5,'per_child',true,false,3),
  ('favours','bucket','Emmertje met keuze-inhoud',16.5,'per_child',true,false,4),
  ('favour-content','chalk','Krijt',0,'one_time',true,false,1),
  ('favour-content','candy','Snoep',0,'one_time',true,false,2),
  ('favour-content','chips','Chips',0,'one_time',true,false,3),
  ('favour-content','slime','Slijm',0,'one_time',true,false,4),
  ('entertainment','slijm','Slijm maken',12.5,'per_participating_child',true,false,1),
  ('entertainment','tattoos','Glittertattoos',7.5,'per_participating_child',true,false,2),
  ('entertainment','cupcake','Cupcake versieren',14.95,'per_participating_child',true,false,3),
  ('entertainment','donuts','Donuts versieren',14.95,'per_participating_child',true,false,4),
  ('entertainment','aardbeien','Aardbeien versieren',12.95,'per_participating_child',true,false,5),
  ('entertainment','armbandjes','Armbandjes maken',9.95,'per_participating_child',true,false,6),
  ('entertainment','schilderen','Schilderen in thema',11.95,'per_participating_child',true,false,7),
  ('entertainment','cakebar','Cake bar',16.5,'per_participating_child',true,false,8),
  ('entertainment','workshop','Creatieve workshop',13.5,'per_participating_child',true,false,9),
  ('decoration-balloons','bal-small','Kleine ballonnenboog',200,'one_time',true,false,1),
  ('decoration-balloons','bal-medium','Medium ballonnenboog',275,'one_time',true,false,2),
  ('decoration-balloons','bal-large','Large ballonnenboog',350,'one_time',true,false,3),
  ('decoration-balloons','bal-xl','Extra large ballonnenboog',425,'one_time',true,false,4),
  ('decoration-balloons','bal-xxl','XXL ballonnenboog',525,'one_time',true,false,5),
  ('decoration-flowers','fresh-flowers','Verse bloemen',95,'one_time',true,false,1),
  ('decoration-flowers','artificial-flowers','Kunstbloemen',65,'one_time',true,false,2),
  ('decoration','zuilen','Zuilen',45,'one_time',true,false,1),
  ('decoration','podiums','Podiums',65,'one_time',true,false,2),
  ('decoration','neon','Neon signs',89,'one_time',true,false,3),
  ('decoration','licht','Lichtcijfers',35,'one_time',true,false,4),
  ('decoration','letters','XL letters',55,'one_time',true,false,5),
  ('decoration','letters-plexi','XL houten letters met plexi',75,'one_time',true,false,6),
  ('decoration','letters-no-plexi','XL houten letters zonder plexi',55,'one_time',true,false,7),
  ('decoration','baby-blocks','Baby blokken',45,'one_time',true,false,8),
  ('decoration','dieren','Dieren',49,'one_time',true,false,9),
  ('decoration','draping','Drapering',75,'one_time',true,false,10),
  ('decoration','shimmer','Shimmer wall',125,'one_time',true,false,11),
  ('decoration','dessert','Dessert tafel styling',95,'one_time',true,false,12),
  ('entrance-board','plexi','Welkomstbord plexiglas',49,'one_time',true,false,1),
  ('entrance-board','printed','Welkomstbord geprint',39,'one_time',true,false,2),
  ('entrance-board','foam','Welkomstbord foam',35,'one_time',true,false,3),
  ('entrance-arch','single-small','Losse ballonnenboog small',200,'one_time',true,false,1),
  ('entrance-arch','single-medium','Losse ballonnenboog medium',275,'one_time',true,false,2),
  ('entrance-arch','single-large','Losse ballonnenboog large',350,'one_time',true,false,3),
  ('entrance-arch','tunnel-3','Ballonnentunnel — 3 bogen',550,'one_time',true,false,4),
  ('entrance-arch','tunnel-4','Ballonnentunnel — 4 bogen',750,'one_time',true,false,5),
  ('entrance-arch','tunnel-5','Ballonnentunnel — 5 bogen',950,'one_time',true,false,6),
  ('entrance-cutouts','cutouts','Cutouts',35,'one_time',true,false,1),
  ('entrance-floor','floor-3m','Gepersonaliseerde vloer — 3 meter',120,'one_time',true,false,1),
  ('entrance-floor','floor-4m','Gepersonaliseerde vloer — 4 meter',150,'one_time',true,false,2),
  ('entrance-floor','floor-5m','Gepersonaliseerde vloer — 5 meter',200,'one_time',true,false,3)
) AS v(cat_step, key, name, base_price, pricing_unit, inc, bus, so)
JOIN component_categories cat ON cat.step_key = v.cat_step
WHERE NOT EXISTS (SELECT 1 FROM party_components WHERE party_components.key = v.key);
