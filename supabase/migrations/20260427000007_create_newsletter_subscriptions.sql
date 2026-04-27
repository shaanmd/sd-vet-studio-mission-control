-- ── Newsletter subscriptions ────────────────────────────────────────────────
-- Provider-agnostic table that mirrors what's in the actual sending tool
-- (Resend audiences for now, but designed to support Beehiiv/ConvertKit/etc).
--
-- One row per (contact, list). Soft-unsubscribe via unsubscribed_at so we
-- keep history. external_id holds the provider's own subscriber ID so we can
-- sync state and call provider APIs without re-querying by email.

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id      UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  list_name       TEXT        NOT NULL,                          -- e.g. "SD VetStudio Main", "SynAlpseVet", "Behind the Bit"
  subscribed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,                                   -- NULL = currently subscribed
  source_tool     TEXT        NOT NULL DEFAULT 'resend'
                              CHECK (source_tool IN ('resend', 'beehiiv', 'convertkit', 'systeme', 'manual')),
  external_id     TEXT,                                          -- Resend audience contact id, etc.
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contact_id, list_name)
);

CREATE INDEX IF NOT EXISTS newsletter_subs_contact_id_idx ON newsletter_subscriptions(contact_id);
CREATE INDEX IF NOT EXISTS newsletter_subs_list_name_idx  ON newsletter_subscriptions(list_name);
CREATE INDEX IF NOT EXISTS newsletter_subs_active_idx     ON newsletter_subscriptions(contact_id) WHERE unsubscribed_at IS NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select newsletter_subscriptions"
  ON newsletter_subscriptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert newsletter_subscriptions"
  ON newsletter_subscriptions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update newsletter_subscriptions"
  ON newsletter_subscriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete newsletter_subscriptions"
  ON newsletter_subscriptions FOR DELETE TO authenticated USING (true);
