CREATE TABLE IF NOT EXISTS mote_pos.payment_methods (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  type text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_methods_workspace_idx ON mote_pos.payment_methods(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_workspace_code_unique ON mote_pos.payment_methods(workspace_id, code);

-- Convert enum columns to text for backward-compatible custom methods
ALTER TABLE mote_pos.transaction_payments ALTER COLUMN method TYPE text;
ALTER TABLE mote_pos.transactions ALTER COLUMN payment_method TYPE text;

-- Seed default payment methods for existing workspaces
INSERT INTO mote_pos.payment_methods (id, workspace_id, code, label, type, is_default, is_active, sort_order)
SELECT 'pm_' || md5(w.id || '|' || m.code), w.id, m.code, m.label, m.type, true, true, m.sort_order
FROM mote_pos.workspaces w
CROSS JOIN (VALUES
  ('cash', 'Cash', 'cash', 0),
  ('qris', 'QRIS', 'cashless', 1),
  ('transfer', 'Transfer', 'cashless', 2),
  ('debt', 'Hutang', 'debt', 3),
  ('deposit', 'Saldo Titipan', 'deposit', 4)
) AS m(code, label, type, sort_order)
ON CONFLICT (workspace_id, code) DO NOTHING;
