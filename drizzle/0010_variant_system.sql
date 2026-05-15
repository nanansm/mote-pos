-- Variant system: product_groups + products.group_id + variant_name
-- Idempotent: aman dijalankan ulang
CREATE TABLE IF NOT EXISTS mote_pos.product_groups (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  category_id text REFERENCES mote_pos.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_groups_workspace_idx ON mote_pos.product_groups(workspace_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS product_groups_category_idx ON mote_pos.product_groups(category_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS product_groups_workspace_name_unique ON mote_pos.product_groups(workspace_id, name);
--> statement-breakpoint
ALTER TABLE mote_pos.products ADD COLUMN IF NOT EXISTS group_id text REFERENCES mote_pos.product_groups(id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE mote_pos.products ADD COLUMN IF NOT EXISTS variant_name text;
--> statement-breakpoint
-- Step 1: Buat group untuk produk existing yang belum ada group-nya
-- Pakai md5 nama untuk stable id agar idempotent. Skip kalau workspace+name sudah ada.
INSERT INTO mote_pos.product_groups (id, workspace_id, category_id, name, is_active, created_at, updated_at)
SELECT DISTINCT ON (p.workspace_id, p.name)
  ('grp_' || md5(p.workspace_id || ':' || p.name))::text AS id,
  p.workspace_id,
  p.category_id,
  p.name,
  bool_or(p.is_active),
  min(p.created_at),
  min(p.updated_at)
FROM mote_pos.products p
WHERE p.group_id IS NULL
GROUP BY p.workspace_id, p.name, p.category_id
ON CONFLICT (workspace_id, name) DO NOTHING;
--> statement-breakpoint
-- Step 2: Link products ke groups (set group_id berdasarkan match workspace + name)
UPDATE mote_pos.products p
SET group_id = pg.id
FROM mote_pos.product_groups pg
WHERE p.group_id IS NULL
  AND p.workspace_id = pg.workspace_id
  AND p.name = pg.name;
--> statement-breakpoint
-- Step 3: Enforce NOT NULL setelah backfill
ALTER TABLE mote_pos.products ALTER COLUMN group_id SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS products_group_idx ON mote_pos.products(group_id);
