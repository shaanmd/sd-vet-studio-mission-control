-- ── Campaign engagement tracking ────────────────────────────────────────────
-- Resend webhooks fire for delivered / opened / clicked / bounced / complained /
-- unsubscribed events. We capture them on campaign_sends (for per-recipient
-- state) and campaign_link_clicks (for per-URL analytics). Aggregate counts
-- live on campaigns so the drill-down view doesn't need to recompute.

-- 1. Per-recipient engagement columns ──────────────────────────────────────
ALTER TABLE campaign_sends
  ADD COLUMN IF NOT EXISTS bounced_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS complained_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS open_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device          TEXT,           -- 'mobile' | 'desktop' | 'tablet' | 'unknown'
  ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_event_at   TIMESTAMPTZ;

-- 2. Drop the old status check so we can add new states ──────────────────
ALTER TABLE campaign_sends DROP CONSTRAINT IF EXISTS campaign_sends_status_check;

ALTER TABLE campaign_sends
  ADD CONSTRAINT campaign_sends_status_check
  CHECK (status IN (
    'queued', 'sent', 'delivered', 'bounced', 'complained',
    'failed', 'opened', 'clicked', 'unsubscribed'
  ));

-- 3. Per-link click table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_link_clicks (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id  UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id   UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  send_id      UUID        REFERENCES campaign_sends(id) ON DELETE CASCADE,
  url          TEXT        NOT NULL,
  user_agent   TEXT,
  device       TEXT,
  clicked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS clc_campaign_id_idx ON campaign_link_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS clc_url_idx         ON campaign_link_clicks(url);
CREATE INDEX IF NOT EXISTS clc_clicked_at_idx  ON campaign_link_clicks(clicked_at DESC);

-- 4. Aggregate counts on campaigns ──────────────────────────────────────────
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS delivered_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opened_count       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bounced_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complained_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unsubscribed_count INTEGER NOT NULL DEFAULT 0;

-- 5. Webhook event log (for replay/debug) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS resend_webhook_events (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id      TEXT        UNIQUE,                       -- Svix message id, prevents double-processing
  event_type    TEXT        NOT NULL,
  email_id      TEXT,                                     -- Resend message id
  payload       JSONB       NOT NULL,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rwe_email_id_idx ON resend_webhook_events(email_id);
CREATE INDEX IF NOT EXISTS rwe_event_type_idx ON resend_webhook_events(event_type);

-- 6. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE campaign_link_clicks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE resend_webhook_events   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage campaign_link_clicks"
  ON campaign_link_clicks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage resend_webhook_events"
  ON resend_webhook_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
