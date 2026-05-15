CREATE TABLE IF NOT EXISTS mote_pos.audit_logs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES mote_pos.workspaces(id) ON DELETE CASCADE,
  outlet_id text REFERENCES mote_pos.outlets(id) ON DELETE SET NULL,
  shift_id text REFERENCES mote_pos.shift_sessions(id) ON DELETE SET NULL,
  cashier_id text REFERENCES mote_pos.cashiers(id) ON DELETE SET NULL,
  user_id text REFERENCES mote_pos."user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_workspace_idx ON mote_pos.audit_logs(workspace_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON mote_pos.audit_logs(workspace_id, action);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON mote_pos.audit_logs(entity_type, entity_id);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE mote_pos.sync_event_type ADD VALUE IF NOT EXISTS 'discount_manual';
EXCEPTION WHEN duplicate_object THEN null; END $$;
