-- ── Newsletter lists as first-class entities ────────────────────────────────
-- Lists were previously just strings on newsletter_subscriptions and campaigns.
-- This promotes them to a real table so each list can have its own from-email,
-- project link, and brand colors (so SynAlpseVet sends from
-- hello@synaipse.vet with its own colors, separate from SD VetStudio Main).

CREATE TABLE IF NOT EXISTS newsletter_lists (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT        NOT NULL UNIQUE,
  description    TEXT,
  project_id     UUID        REFERENCES projects(id) ON DELETE SET NULL,
  from_email     TEXT        NOT NULL DEFAULT 'noreply@sdvetstudio.com',
  from_name      TEXT        NOT NULL DEFAULT 'Mission Control',
  brand_primary  TEXT        NOT NULL DEFAULT '#1E6B5E'
                             CHECK (brand_primary ~* '^#[0-9a-f]{6}$'),
  brand_accent   TEXT        NOT NULL DEFAULT '#D4A853'
                             CHECK (brand_accent  ~* '^#[0-9a-f]{6}$'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS newsletter_lists_project_id_idx ON newsletter_lists(project_id);

-- Backfill: insert one row per distinct list_name found anywhere we use them.
INSERT INTO newsletter_lists (name)
SELECT DISTINCT list_name
FROM (
  SELECT list_name FROM newsletter_subscriptions
  UNION
  SELECT list_name FROM campaigns
) AS all_list_names
WHERE list_name IS NOT NULL
  AND list_name NOT IN (SELECT name FROM newsletter_lists)
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE newsletter_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage newsletter_lists"
  ON newsletter_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);
