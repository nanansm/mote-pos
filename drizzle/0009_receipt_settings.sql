-- Receipt + auto-print settings on workspaces
ALTER TABLE mote_pos.workspaces
  ADD COLUMN IF NOT EXISTS auto_print_receipt boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_print_shift_report boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_paper_size text NOT NULL DEFAULT '80mm',
  ADD COLUMN IF NOT EXISTS receipt_note text,
  ADD COLUMN IF NOT EXISTS receipt_show_phone boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receipt_show_address boolean NOT NULL DEFAULT true;
--> statement-breakpoint
UPDATE mote_pos.workspaces
SET receipt_note = 'Terima kasih sudah berbelanja.'
WHERE receipt_note IS NULL;
