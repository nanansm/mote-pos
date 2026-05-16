-- 0017 — Shift auto-close + closed_reason tracking + owner-cashier flag
ALTER TABLE mote_pos.shift_sessions
  ADD COLUMN IF NOT EXISTS closed_reason text;
--> statement-breakpoint
ALTER TABLE mote_pos.shift_sessions
  ADD COLUMN IF NOT EXISTS auto_closed boolean NOT NULL DEFAULT false;
--> statement-breakpoint
COMMENT ON COLUMN mote_pos.shift_sessions.closed_reason IS 'manual | auto_closed_timeout | force_closed_admin | data_repair | duplicate_open_repair | ghost_shift_data_repair';
--> statement-breakpoint
COMMENT ON COLUMN mote_pos.shift_sessions.auto_closed IS 'true if closed via auto-close cron job';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS shift_sessions_status_opened_idx
  ON mote_pos.shift_sessions (status, opened_at)
  WHERE status = 'open';
--> statement-breakpoint
ALTER TABLE mote_pos.cashiers
  ADD COLUMN IF NOT EXISTS is_owner_cashier boolean NOT NULL DEFAULT false;
--> statement-breakpoint
COMMENT ON COLUMN mote_pos.cashiers.is_owner_cashier IS 'true if this cashier record was auto-created at workspace onboarding for the owner user';
--> statement-breakpoint
-- Backfill: mark cashiers that match the workspace owner.name as owner-cashier.
UPDATE mote_pos.cashiers c
SET is_owner_cashier = true
WHERE c.role = 'manager'
  AND EXISTS (
    SELECT 1
    FROM mote_pos.workspaces w
    JOIN mote_pos."user" u ON w.owner_id = u.id
    WHERE w.id = c.workspace_id
      AND u.name = c.name
  );
