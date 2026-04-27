-- ── Fix tasks.assigned_to: uuid → text ──────────────────────────────────────
-- The UI uses 'shaan' / 'deb' / 'both' as ownership values (matching paid_by,
-- logged_by, brought_in_by elsewhere in the app). The column was originally
-- uuid FK to profiles, which made every task assignment fail with
-- "invalid input syntax for type uuid: shaan". The daily-digest cron also
-- filtered on text values, so it was returning zero tasks.

-- Drop the FK if it exists. Constraint name may vary across deployments.
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT conname INTO fk_name
  FROM pg_constraint
  WHERE conrelid = 'tasks'::regclass
    AND contype = 'f'
    AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'tasks'::regclass AND attname = 'assigned_to')];
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

-- Change column type, preserving existing values as text.
ALTER TABLE tasks
  ALTER COLUMN assigned_to TYPE TEXT USING assigned_to::text;

-- Any leftover uuid values (legacy profile IDs) become NULL — they were never
-- visible in the UI anyway since the form only knows shaan/deb/both.
UPDATE tasks
SET assigned_to = NULL
WHERE assigned_to IS NOT NULL
  AND assigned_to NOT IN ('shaan', 'deb', 'both');

-- Lock down the column to the three valid values.
ALTER TABLE tasks
  ADD CONSTRAINT tasks_assigned_to_check
  CHECK (assigned_to IS NULL OR assigned_to IN ('shaan', 'deb', 'both'));
