-- ── Contacts ────────────────────────────────────────────────────────────────────
-- Master entity for any person you know: clients, leads, collaborators, referrers.
-- Leads stay in the leads table; a lead can be "converted" to a contact.

CREATE TABLE IF NOT EXISTS contacts (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  company       TEXT,
  role          TEXT,                         -- e.g. "Director", "Owner", "Vet"
  email         TEXT,
  phone         TEXT,
  location      TEXT,
  website       TEXT,
  linkedin      TEXT,
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'past', 'paused')),
  is_repeat     BOOLEAN     NOT NULL DEFAULT false,
  -- Knowledge fields (freeform, markdown-friendly)
  comms_style         TEXT,
  decision_style      TEXT,
  personal_context    TEXT,
  future_opportunities TEXT,
  -- Optional: link back to a lead this was converted from
  lead_id       UUID        REFERENCES leads(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Project ↔ Contact join ────────────────────────────────────────────────────
-- A contact can be linked to multiple projects (as client, collaborator, etc.)
-- Not just consulting — any project can have contacts.

CREATE TABLE IF NOT EXISTS project_contacts (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contact_id    UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  role_label    TEXT,                          -- e.g. "Client", "Collaborator", "Referral source"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, contact_id)
);

-- ── Comms log ────────────────────────────────────────────────────────────────
-- Timeline of all communications with a contact.

CREATE TABLE IF NOT EXISTS comms_log (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id    UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  kind          TEXT        NOT NULL DEFAULT 'note'
                            CHECK (kind IN ('email', 'call', 'meeting', 'note')),
  summary       TEXT        NOT NULL,
  logged_by     TEXT        NOT NULL DEFAULT 'shaan',  -- 'shaan' | 'deb'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS comms_log_contact_id_idx ON comms_log(contact_id);
CREATE INDEX IF NOT EXISTS project_contacts_project_id_idx ON project_contacts(project_id);
CREATE INDEX IF NOT EXISTS project_contacts_contact_id_idx ON project_contacts(contact_id);
