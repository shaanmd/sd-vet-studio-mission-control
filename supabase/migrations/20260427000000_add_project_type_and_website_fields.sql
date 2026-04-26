ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_type TEXT
    CHECK (project_type IN ('website_build', 'saas', 'course', 'consulting', 'content', 'tool')),
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS ga4_property_id TEXT,
  ADD COLUMN IF NOT EXISTS monthly_visitors INTEGER;
