CREATE TABLE IF NOT EXISTS mote_pos.cashier_sessions (
  id text PRIMARY KEY,
  cashier_id text NOT NULL REFERENCES mote_pos.cashiers(id) ON DELETE CASCADE,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  outlet_id text NOT NULL REFERENCES mote_pos.outlets(id) ON DELETE CASCADE,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cashier_sessions_token_idx ON mote_pos.cashier_sessions(token);
CREATE INDEX IF NOT EXISTS cashier_sessions_cashier_idx ON mote_pos.cashier_sessions(cashier_id);
