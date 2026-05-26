-- 0018 — Receipt toggles: show cashier name / show transaction number (default ON)
ALTER TABLE mote_pos.workspaces
  ADD COLUMN IF NOT EXISTS receipt_show_cashier boolean NOT NULL DEFAULT true;
--> statement-breakpoint
ALTER TABLE mote_pos.workspaces
  ADD COLUMN IF NOT EXISTS receipt_show_trx_no boolean NOT NULL DEFAULT true;
--> statement-breakpoint
COMMENT ON COLUMN mote_pos.workspaces.receipt_show_cashier IS 'show "Kasir" line on receipts (ESC/POS + browser)';
--> statement-breakpoint
COMMENT ON COLUMN mote_pos.workspaces.receipt_show_trx_no IS 'show "No" (transaction number) line on receipts (ESC/POS + browser)';
