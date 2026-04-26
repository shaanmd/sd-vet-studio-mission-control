ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence TEXT CHECK (recurrence IN ('daily', 'weekly', 'monthly'));
