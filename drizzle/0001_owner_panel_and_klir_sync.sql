-- Owner panel + Klir sync columns
DO $$ BEGIN
  CREATE TYPE mote_pos.user_role AS ENUM ('user', 'owner');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE mote_pos."user"
  ADD COLUMN IF NOT EXISTS role mote_pos.user_role NOT NULL DEFAULT 'user';
--> statement-breakpoint
ALTER TABLE mote_pos.workspaces
  ADD COLUMN IF NOT EXISTS klir_workspace_id text,
  ADD COLUMN IF NOT EXISTS klir_api_token text,
  ADD COLUMN IF NOT EXISTS klir_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS klir_last_sync_at timestamptz;
