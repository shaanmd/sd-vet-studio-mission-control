CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'cofounder'
    CHECK (meeting_type IN ('cofounder', 'client', 'lead', 'investor', 'mentor', 'other')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  agenda TEXT,
  notes TEXT,
  action_items JSONB NOT NULL DEFAULT '[]',
  drive_transcript_url TEXT,
  ai_summary TEXT,
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_at ON meetings(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type);
