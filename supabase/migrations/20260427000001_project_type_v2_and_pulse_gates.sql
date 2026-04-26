-- Migration: project_type_v2_and_pulse_gates
-- Updates project_type constraint to new allowed values and adds launch_gates / pulse_values JSONB columns.

-- 1. Drop the old project_type constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;

-- 2. Migrate existing data to new type values
UPDATE projects SET project_type = 'saas' WHERE project_type = 'tool';
UPDATE projects SET project_type = 'other' WHERE project_type = 'content';

-- 3. Add updated constraint with new allowed values
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check
  CHECK (project_type IN ('website_build', 'saas', 'course', 'consulting', 'other'));

-- 4. Add launch_gates and pulse_values JSONB columns
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS launch_gates JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pulse_values JSONB NOT NULL DEFAULT '[]';
