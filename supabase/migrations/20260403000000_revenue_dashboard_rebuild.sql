-- supabase/migrations/20260403000000_revenue_dashboard_rebuild.sql

-- ============================================================
-- PHASE 1: Drop tables from old schema no longer needed
-- ============================================================

DROP TABLE IF EXISTS personal_tasks CASCADE;
DROP TABLE IF EXISTS lead_feedback CASCADE;

-- ============================================================
-- PHASE 2: Modify existing tables
-- ============================================================

-- Add revenue fields to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revenue_score text DEFAULT 'low'
    CHECK (revenue_score IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS revenue_stream text
    CHECK (revenue_stream IN ('course', 'subscription', 'inapp', 'consulting', 'sponsorship', 'affiliate', 'other')),
  ADD COLUMN IF NOT EXISTS revenue_per_conversion numeric;

-- ============================================================
-- PHASE 3: Create new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text NOT NULL
    CHECK (category IN ('hosting', 'domains', 'subscriptions', 'tools_ai', 'marketing', 'other')),
  project_id uuid REFERENCES projects ON DELETE SET NULL,
  paid_by text NOT NULL
    CHECK (paid_by IN ('shaan', 'deb', 'split')),
  expense_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  stream text NOT NULL
    CHECK (stream IN ('course', 'subscription', 'inapp', 'consulting', 'sponsorship', 'affiliate', 'other')),
  project_id uuid REFERENCES projects ON DELETE SET NULL,
  revenue_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects ON DELETE CASCADE,
  income_potential text,
  build_difficulty text,
  recommendation text,
  raw_output text,
  analysed_at timestamptz DEFAULT now(),
  analysed_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE,
  platform text NOT NULL
    CHECK (platform IN ('instagram', 'tiktok', 'email', 'youtube', 'other')),
  description text NOT NULL,
  scheduled_date date,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PHASE 4: RLS policies for new tables
-- ============================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access" ON expenses
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON revenue_entries
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON project_analysis
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON content_items
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON lead_notes
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- PHASE 5: Activity log trigger for revenue entries
-- ============================================================

CREATE OR REPLACE FUNCTION log_revenue_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, actor_id, action, description, is_win)
  VALUES (
    NEW.project_id,
    NEW.created_by,
    'revenue_logged',
    'Revenue logged: ' || NEW.description || ' ($' || NEW.amount || ')',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_revenue_entry_created ON revenue_entries;
CREATE TRIGGER on_revenue_entry_created
  AFTER INSERT ON revenue_entries
  FOR EACH ROW EXECUTE FUNCTION log_revenue_entry();

-- ============================================================
-- PHASE 6: Seed Resources with SD VetStudio Project Prioritizer
-- ============================================================

INSERT INTO resources (category, name, description, url, icon, sort_order)
VALUES (
  'ai',
  'SD VetStudio Project Prioritizer',
  'Analyses a project for income potential and build difficulty',
  'https://sooper-dooper-project-prioritizer.vercel.app/',
  '🎯',
  1
)
ON CONFLICT DO NOTHING;
