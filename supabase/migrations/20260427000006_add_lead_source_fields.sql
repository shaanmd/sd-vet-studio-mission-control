-- ── Add structured source fields to leads ───────────────────────────────────
-- Captures HOW the lead came in (channel) and WHO introduced them.
-- The existing `source` column stays as freeform "specifics" notes.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source_channel TEXT
  CHECK (source_channel IN ('linkedin', 'email', 'phone', 'personal', 'website', 'referral', 'event', 'other'));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS brought_in_by TEXT
  CHECK (brought_in_by IN ('shaan', 'deb', 'other'));

CREATE INDEX IF NOT EXISTS leads_source_channel_idx ON leads(source_channel);
CREATE INDEX IF NOT EXISTS leads_brought_in_by_idx ON leads(brought_in_by);
