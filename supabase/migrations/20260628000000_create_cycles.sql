-- ── Cycles ───────────────────────────────────────────────────────────────────
-- A "cycle" is a 6-week focus period + 1-week cooldown (Basecamp/Shape Up style).
-- Phase (active/cooldown/done) is DERIVED from dates in app code, not stored.

CREATE TABLE IF NOT EXISTS cycles (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT        NOT NULL,
  starts_on        DATE        NOT NULL,
  ends_on          DATE        NOT NULL,
  cooldown_ends_on DATE        NOT NULL,
  created_by       TEXT        CHECK (created_by IN ('shaan', 'deb')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on >= starts_on),
  CHECK (cooldown_ends_on >= ends_on)
);

CREATE INDEX IF NOT EXISTS cycles_starts_on_idx ON cycles(starts_on DESC);

-- ── Cycle bets ───────────────────────────────────────────────────────────────
-- A "bet" = a project you commit to this cycle, with one goal line + an owner.

CREATE TABLE IF NOT EXISTS cycle_bets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id    UUID        NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  goal_line   TEXT        NOT NULL,
  owner       TEXT        NOT NULL DEFAULT 'both' CHECK (owner IN ('shaan', 'deb', 'both')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, project_id)
);

CREATE INDEX IF NOT EXISTS cycle_bets_cycle_id_idx ON cycle_bets(cycle_id);

-- ── Bet check-ins ────────────────────────────────────────────────────────────
-- One row per (bet, day). The check-in API upserts on (bet_id, checkin_date).

CREATE TABLE IF NOT EXISTS bet_checkins (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_id       UUID        NOT NULL REFERENCES cycle_bets(id) ON DELETE CASCADE,
  checkin_date DATE        NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('on_track', 'stuck', 'done')),
  note         TEXT,
  created_by   TEXT        CHECK (created_by IN ('shaan', 'deb')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bet_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS bet_checkins_bet_id_idx ON bet_checkins(bet_id, checkin_date DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE cycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_bets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cycles"
  ON cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage cycle_bets"
  ON cycle_bets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage bet_checkins"
  ON bet_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);
