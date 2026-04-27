-- ── Merge leads into contacts (Phase 1) ─────────────────────────────────────
-- Adds lifecycle and pipeline-source columns to contacts, then backfills from
-- the existing leads table. The leads table itself stays put for now — the
-- existing /leads UI still reads/writes it — but it becomes a derived view of
-- contacts in Phase 2 once we've verified everything looks right.
--
-- Mapping from leads.status to contacts.lifecycle_stage:
--   archived  → past
--   trialing  → qualified
--   converted → customer
--   active/contacted/null → lead (if not already converted to a contact)

-- 1. Add columns to contacts ───────────────────────────────────────────────
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT NOT NULL DEFAULT 'customer'
    CHECK (lifecycle_stage IN ('lead', 'qualified', 'customer', 'past')),
  ADD COLUMN IF NOT EXISTS interest_level TEXT
    CHECK (interest_level IN ('hot', 'warm', 'curious')),
  ADD COLUMN IF NOT EXISTS source_channel TEXT
    CHECK (source_channel IN ('linkedin', 'email', 'phone', 'personal', 'website', 'referral', 'event', 'other')),
  ADD COLUMN IF NOT EXISTS brought_in_by TEXT
    CHECK (brought_in_by IN ('shaan', 'deb', 'other')),
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS contacts_lifecycle_stage_idx ON contacts(lifecycle_stage);

-- 2. Backfill already-converted leads ─────────────────────────────────────
-- These contacts already exist (have lead_id set). Pull their pipeline fields
-- across, but don't overwrite anything the user has manually set on contacts.
UPDATE contacts c
SET
  interest_level  = COALESCE(c.interest_level, l.interest_level),
  source_channel  = COALESCE(c.source_channel, l.source_channel),
  brought_in_by   = COALESCE(c.brought_in_by,  l.brought_in_by),
  source          = COALESCE(c.source,         l.source),
  is_beta_tester  = c.is_beta_tester OR COALESCE(l.is_beta_tester, false),
  lifecycle_stage = CASE
    WHEN l.status = 'archived'  THEN 'past'
    WHEN l.status = 'trialing'  THEN 'qualified'
    WHEN l.status = 'converted' THEN 'customer'
    ELSE 'qualified'
  END
FROM leads l
WHERE c.lead_id = l.id;

-- 3. Backfill unconverted leads as new contacts ───────────────────────────
INSERT INTO contacts (
  name, role, email, phone,
  status, is_repeat,
  lead_id,
  lifecycle_stage,
  interest_level, source_channel, brought_in_by, source, is_beta_tester,
  created_at
)
SELECT
  l.name, l.role_clinic, l.contact_email, l.contact_phone,
  'active', false,
  l.id,
  CASE
    WHEN l.status = 'archived' THEN 'past'
    WHEN l.status = 'trialing' THEN 'qualified'
    ELSE 'lead'
  END,
  l.interest_level, l.source_channel, l.brought_in_by, l.source, COALESCE(l.is_beta_tester, false),
  l.created_at
FROM leads l
WHERE NOT EXISTS (SELECT 1 FROM contacts c WHERE c.lead_id = l.id);

-- 4. Link migrated contacts to the lead's project ─────────────────────────
INSERT INTO project_contacts (project_id, contact_id, role_label)
SELECT l.project_id, c.id, 'From lead'
FROM leads l
JOIN contacts c ON c.lead_id = l.id
WHERE l.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_contacts pc
    WHERE pc.project_id = l.project_id AND pc.contact_id = c.id
  );
