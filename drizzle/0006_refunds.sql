CREATE TABLE IF NOT EXISTS mote_pos.refunds (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  transaction_id text NOT NULL REFERENCES mote_pos.transactions(id) ON DELETE CASCADE,
  refund_amount bigint NOT NULL,
  refund_method text NOT NULL DEFAULT 'cash',
  reason text NOT NULL,
  refunded_by_cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL,
  approved_by_manager_pin boolean NOT NULL DEFAULT true,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS refunds_workspace_idx ON mote_pos.refunds(workspace_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS refunds_transaction_idx ON mote_pos.refunds(transaction_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS mote_pos.refund_items (
  id text PRIMARY KEY,
  refund_id text NOT NULL REFERENCES mote_pos.refunds(id) ON DELETE CASCADE,
  transaction_item_id text NOT NULL REFERENCES mote_pos.transaction_items(id) ON DELETE CASCADE,
  product_id text REFERENCES mote_pos.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL,
  unit_amount bigint NOT NULL,
  total_amount bigint NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS refund_items_refund_idx ON mote_pos.refund_items(refund_id);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.trx_status ADD VALUE IF NOT EXISTS 'partial_refund';
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.sync_event_type ADD VALUE IF NOT EXISTS 'partial_refund';
EXCEPTION WHEN duplicate_object THEN null; END $$;
