CREATE TABLE IF NOT EXISTS wins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  win_type TEXT NOT NULL DEFAULT 'milestone'
    CHECK (win_type IN ('award', 'milestone', 'launch', 'revenue', 'partnership', 'feedback', 'other')),
  happened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
