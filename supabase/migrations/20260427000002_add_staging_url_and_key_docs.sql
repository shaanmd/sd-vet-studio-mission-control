-- Add staging URL and key docs (PRD, Claude Design, Branding, Lead magnets, etc.) to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS staging_url TEXT,
  ADD COLUMN IF NOT EXISTS key_docs JSONB NOT NULL DEFAULT '[]';
