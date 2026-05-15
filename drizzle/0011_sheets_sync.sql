ALTER TABLE mote_pos.workspaces
  ADD COLUMN IF NOT EXISTS sheets_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sheets_sync_url text,
  ADD COLUMN IF NOT EXISTS sheets_sync_id text,
  ADD COLUMN IF NOT EXISTS sheets_last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS sheets_last_sync_status text,
  ADD COLUMN IF NOT EXISTS sheets_last_sync_error text;
