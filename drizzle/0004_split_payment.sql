CREATE TABLE IF NOT EXISTS mote_pos.transaction_payments (
  id text PRIMARY KEY,
  transaction_id text NOT NULL REFERENCES mote_pos.transactions(id) ON DELETE CASCADE,
  method text NOT NULL,
  amount bigint NOT NULL,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS transaction_payments_trx_idx ON mote_pos.transaction_payments(transaction_id);
--> statement-breakpoint
-- Allow 'split' and 'debt' as payment_method snapshot values.
-- payment_method is a Postgres enum in Prompt 1; add new values if needed.
DO $$ BEGIN
  ALTER TYPE mote_pos.payment_method ADD VALUE IF NOT EXISTS 'debt';
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.payment_method ADD VALUE IF NOT EXISTS 'split';
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE mote_pos.transactions
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'amount';
--> statement-breakpoint
ALTER TABLE mote_pos.transaction_items
  ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'amount';
