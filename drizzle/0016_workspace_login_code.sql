-- Workspace login_code (nullable; backfilled via tsx script, then SET NOT NULL)
ALTER TABLE mote_pos.workspaces ADD COLUMN IF NOT EXISTS login_code text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_login_code_unique
  ON mote_pos.workspaces(login_code)
  WHERE login_code IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS workspaces_login_code_idx
  ON mote_pos.workspaces(login_code)
  WHERE login_code IS NOT NULL;
--> statement-breakpoint
-- Invalidate all existing cashier sessions; force re-login via /k/[code]
DELETE FROM mote_pos.cashier_sessions;
