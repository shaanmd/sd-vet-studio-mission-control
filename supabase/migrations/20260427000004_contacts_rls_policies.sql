-- ── RLS policies for contacts, project_contacts, comms_log ──────────────────
-- This is a private internal tool used only by authenticated team members.
-- All authenticated users can read/write all rows.

-- contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select contacts"
  ON contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contacts"
  ON contacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
  ON contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contacts"
  ON contacts FOR DELETE TO authenticated USING (true);

-- project_contacts
ALTER TABLE project_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select project_contacts"
  ON project_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert project_contacts"
  ON project_contacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update project_contacts"
  ON project_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete project_contacts"
  ON project_contacts FOR DELETE TO authenticated USING (true);

-- comms_log
ALTER TABLE comms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select comms_log"
  ON comms_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert comms_log"
  ON comms_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update comms_log"
  ON comms_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete comms_log"
  ON comms_log FOR DELETE TO authenticated USING (true);
