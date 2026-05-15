CREATE TABLE IF NOT EXISTS mote_pos.held_carts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  outlet_id text NOT NULL REFERENCES mote_pos.outlets(id) ON DELETE CASCADE,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  cashier_id text NOT NULL REFERENCES mote_pos.cashiers(id) ON DELETE CASCADE,
  label text NOT NULL,
  customer_id text REFERENCES mote_pos.customers(id) ON DELETE SET NULL,
  customer_name text,
  customer_phone text,
  cart_data jsonb NOT NULL,
  subtotal bigint NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS held_carts_workspace_outlet_idx ON mote_pos.held_carts(workspace_id, outlet_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS held_carts_shift_idx ON mote_pos.held_carts(shift_id) WHERE shift_id IS NOT NULL;
