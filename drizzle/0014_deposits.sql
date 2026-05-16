CREATE TABLE IF NOT EXISTS mote_pos.customer_deposits (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  customer_id text NOT NULL REFERENCES mote_pos.customers(id) ON DELETE CASCADE,
  amount bigint NOT NULL,
  balance bigint NOT NULL,
  notes text,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  created_by_cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL,
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS customer_deposits_workspace_idx ON mote_pos.customer_deposits(workspace_id);
CREATE INDEX IF NOT EXISTS customer_deposits_customer_idx ON mote_pos.customer_deposits(customer_id, status);

CREATE TABLE IF NOT EXISTS mote_pos.deposit_usages (
  id text PRIMARY KEY,
  deposit_id text NOT NULL REFERENCES mote_pos.customer_deposits(id) ON DELETE CASCADE,
  transaction_id text REFERENCES mote_pos.transactions(id) ON DELETE SET NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL,
  used_by_cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposit_usages_deposit_idx ON mote_pos.deposit_usages(deposit_id);

ALTER TABLE mote_pos.customers ADD COLUMN IF NOT EXISTS total_deposit_balance bigint NOT NULL DEFAULT 0;
