-- Customer database + link from transactions
CREATE TABLE IF NOT EXISTS mote_pos.customers (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  notes text,
  total_purchases bigint NOT NULL DEFAULT 0,
  total_debt bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customers_workspace_idx ON mote_pos.customers(workspace_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customers_phone_idx ON mote_pos.customers(workspace_id, phone) WHERE phone IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customers_name_idx ON mote_pos.customers(workspace_id, name);
--> statement-breakpoint
ALTER TABLE mote_pos.transactions
  ADD COLUMN IF NOT EXISTS customer_id text REFERENCES mote_pos.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_phone text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS transactions_customer_idx ON mote_pos.transactions(customer_id) WHERE customer_id IS NOT NULL;
