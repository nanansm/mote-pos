CREATE TABLE IF NOT EXISTS mote_pos.customer_debts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES mote_pos.customers(id) ON DELETE CASCADE,
  transaction_id text REFERENCES mote_pos.transactions(id) ON DELETE SET NULL,
  amount bigint NOT NULL,
  paid_amount bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_debts_workspace_status_idx ON mote_pos.customer_debts(workspace_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS customer_debts_customer_idx ON mote_pos.customer_debts(customer_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS mote_pos.debt_payments (
  id text PRIMARY KEY,
  debt_id text NOT NULL REFERENCES mote_pos.customer_debts(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  payment_method text NOT NULL,
  paid_by_cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS debt_payments_debt_idx ON mote_pos.debt_payments(debt_id);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.sync_event_type ADD VALUE IF NOT EXISTS 'debt_created';
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.sync_event_type ADD VALUE IF NOT EXISTS 'debt_paid';
EXCEPTION WHEN duplicate_object THEN null; END $$;
