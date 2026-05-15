CREATE TABLE IF NOT EXISTS mote_pos.price_overrides (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  transaction_id text REFERENCES mote_pos.transactions(id) ON DELETE CASCADE,
  product_id text REFERENCES mote_pos.products(id) ON DELETE SET NULL,
  original_price bigint NOT NULL,
  new_price bigint NOT NULL,
  difference bigint NOT NULL,
  cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL,
  approved_by_manager_pin boolean NOT NULL DEFAULT true,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS price_overrides_workspace_idx ON mote_pos.price_overrides(workspace_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS price_overrides_transaction_idx ON mote_pos.price_overrides(transaction_id);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.sync_event_type ADD VALUE IF NOT EXISTS 'price_override';
EXCEPTION WHEN duplicate_object THEN null; END $$;
