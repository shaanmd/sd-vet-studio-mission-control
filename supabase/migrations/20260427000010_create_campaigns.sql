-- ── Campaigns ───────────────────────────────────────────────────────────────
-- A "campaign" is a one-off newsletter draft → send. Multi-step automation
-- (sequences) lives in a separate table, built later.

CREATE TABLE IF NOT EXISTS campaigns (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  list_name       TEXT        NOT NULL,
  subject         TEXT        NOT NULL DEFAULT '',
  preview_text    TEXT,
  body_markdown   TEXT        NOT NULL DEFAULT '',
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  recipient_count INTEGER     NOT NULL DEFAULT 0,
  sent_count      INTEGER     NOT NULL DEFAULT 0,
  failed_count    INTEGER     NOT NULL DEFAULT 0,
  sent_at         TIMESTAMPTZ,
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_list_name_idx ON campaigns(list_name);
CREATE INDEX IF NOT EXISTS campaigns_status_idx    ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_sent_at_idx   ON campaigns(sent_at DESC) WHERE sent_at IS NOT NULL;

-- ── Campaign sends ──────────────────────────────────────────────────────────
-- One row per (campaign, contact) — tracks Resend message id and engagement
-- once we wire up webhooks. Even without webhooks, this gives us a per-recipient
-- sent log.

CREATE TABLE IF NOT EXISTS campaign_sends (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id       UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id        UUID        NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email             TEXT        NOT NULL,
  resend_message_id TEXT,
  status            TEXT        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'opened', 'clicked')),
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  clicked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS campaign_sends_campaign_id_idx ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_sends_contact_id_idx  ON campaign_sends(contact_id);
CREATE INDEX IF NOT EXISTS campaign_sends_message_id_idx  ON campaign_sends(resend_message_id) WHERE resend_message_id IS NOT NULL;

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage campaigns"
  ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage campaign_sends"
  ON campaign_sends FOR ALL TO authenticated USING (true) WITH CHECK (true);
