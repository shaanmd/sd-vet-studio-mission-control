-- ── Add status column to leads ──────────────────────────────────────────────
-- The EditLeadModal already exposes a status pill row (Active / Contacted /
-- Trialing / Converted / Archived) but the column didn't exist, so saving
-- failed silently. This adds it with a default of 'active' so existing rows
-- don't break.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'contacted', 'trialing', 'converted', 'archived'));

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
