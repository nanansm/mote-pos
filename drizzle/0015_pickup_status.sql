ALTER TABLE mote_pos.transactions ADD COLUMN IF NOT EXISTS pickup_status text NOT NULL DEFAULT 'pickup_immediate';
ALTER TABLE mote_pos.transactions ADD COLUMN IF NOT EXISTS pickup_at timestamptz;
ALTER TABLE mote_pos.transactions ADD COLUMN IF NOT EXISTS pickup_by_cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL;
ALTER TABLE mote_pos.transactions ADD COLUMN IF NOT EXISTS pickup_notes text;

CREATE INDEX IF NOT EXISTS trx_pickup_status_idx ON mote_pos.transactions(workspace_id, pickup_status);
