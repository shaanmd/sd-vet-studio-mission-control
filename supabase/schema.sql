-- =============================================================================
-- SD VetStudio Mission Control — Full Database Schema
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ===========================================================================
-- TABLES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- Extends auth.users. Populated automatically on signup via trigger below.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  role          TEXT,
  avatar_url    TEXT,
  slack_user_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               TEXT NOT NULL,
  emoji              TEXT,
  summary            TEXT,
  stage              TEXT NOT NULL DEFAULT 'inbox'
                       CHECK (stage IN ('inbox','someday','exploring','building','live','maintenance','archived')),
  pinned             BOOLEAN NOT NULL DEFAULT FALSE,
  github_repo        TEXT,
  vercel_project_id  TEXT,
  live_url           TEXT,
  created_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- tasks  (shared / project-level)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  assigned_to   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_shared     BOOLEAN NOT NULL DEFAULT FALSE,
  is_next_step  BOOLEAN NOT NULL DEFAULT FALSE,
  energy        TEXT CHECK (energy IN ('high','medium','low')),
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  completed_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- personal_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personal_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id   UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  energy       TEXT CHECK (energy IN ('high','medium','low')),
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- project_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_links (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  url        TEXT NOT NULL,
  icon       TEXT,
  is_auto    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------------
-- project_notes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  note_type  TEXT NOT NULL DEFAULT 'note'
               CHECK (note_type IN ('note','stage_change','deploy','task_complete')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  description TEXT,
  metadata    JSONB,
  is_win      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- resources
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category    TEXT NOT NULL
                CHECK (category IN ('dev','marketing','ai','business','brand','contacts')),
  name        TEXT NOT NULL,
  description TEXT,
  url         TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  role_clinic         TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  source              TEXT,
  interest_level      TEXT CHECK (interest_level IN ('hot','warm','curious')),
  is_beta_tester      BOOLEAN NOT NULL DEFAULT FALSE,
  beta_invited_at     TIMESTAMPTZ,
  beta_accepted       TEXT DEFAULT 'pending'
                        CHECK (beta_accepted IN ('yes','no','pending')),
  beta_app_version    TEXT,
  beta_feedback_status TEXT DEFAULT 'awaiting'
                         CHECK (beta_feedback_status IN ('awaiting','received','follow_up')),
  added_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- lead_feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_feedback (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- github_cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.github_cache (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id           UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  last_commit_message  TEXT,
  last_commit_author   TEXT,
  last_commit_at       TIMESTAMPTZ,
  open_prs             INTEGER NOT NULL DEFAULT 0,
  deploy_status        TEXT DEFAULT 'ready'
                         CHECK (deploy_status IN ('ready','building','error')),
  deploy_url           TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ===========================================================================
-- ROW-LEVEL SECURITY
-- All tables: authenticated users have full access.
-- ===========================================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_feedback  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_cache   ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "authenticated_full_access" ON public.profiles;
CREATE POLICY "authenticated_full_access" ON public.profiles
  FOR ALL USING (auth.role() = 'authenticated');

-- projects
DROP POLICY IF EXISTS "authenticated_full_access" ON public.projects;
CREATE POLICY "authenticated_full_access" ON public.projects
  FOR ALL USING (auth.role() = 'authenticated');

-- tasks
DROP POLICY IF EXISTS "authenticated_full_access" ON public.tasks;
CREATE POLICY "authenticated_full_access" ON public.tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- personal_tasks
DROP POLICY IF EXISTS "authenticated_full_access" ON public.personal_tasks;
CREATE POLICY "authenticated_full_access" ON public.personal_tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- project_links
DROP POLICY IF EXISTS "authenticated_full_access" ON public.project_links;
CREATE POLICY "authenticated_full_access" ON public.project_links
  FOR ALL USING (auth.role() = 'authenticated');

-- project_notes
DROP POLICY IF EXISTS "authenticated_full_access" ON public.project_notes;
CREATE POLICY "authenticated_full_access" ON public.project_notes
  FOR ALL USING (auth.role() = 'authenticated');

-- activity_log
DROP POLICY IF EXISTS "authenticated_full_access" ON public.activity_log;
CREATE POLICY "authenticated_full_access" ON public.activity_log
  FOR ALL USING (auth.role() = 'authenticated');

-- resources
DROP POLICY IF EXISTS "authenticated_full_access" ON public.resources;
CREATE POLICY "authenticated_full_access" ON public.resources
  FOR ALL USING (auth.role() = 'authenticated');

-- leads
DROP POLICY IF EXISTS "authenticated_full_access" ON public.leads;
CREATE POLICY "authenticated_full_access" ON public.leads
  FOR ALL USING (auth.role() = 'authenticated');

-- lead_feedback
DROP POLICY IF EXISTS "authenticated_full_access" ON public.lead_feedback;
CREATE POLICY "authenticated_full_access" ON public.lead_feedback
  FOR ALL USING (auth.role() = 'authenticated');

-- github_cache
DROP POLICY IF EXISTS "authenticated_full_access" ON public.github_cache;
CREATE POLICY "authenticated_full_access" ON public.github_cache
  FOR ALL USING (auth.role() = 'authenticated');


-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- update_updated_at — keep projects.updated_at current
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_updated_at ON public.projects;
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_updated_at();


-- ---------------------------------------------------------------------------
-- log_task_completion — fires when a task is marked complete
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_task_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when completed flips from false -> true
  IF OLD.completed = FALSE AND NEW.completed = TRUE THEN
    -- Record completed_at / completed_by
    NEW.completed_at = NOW();

    -- activity_log entry (counted as a win)
    INSERT INTO public.activity_log
      (project_id, actor_id, action, description, is_win)
    VALUES (
      NEW.project_id,
      NEW.completed_by,
      'task_complete',
      'Task completed: ' || NEW.title,
      TRUE
    );

    -- project_notes entry
    INSERT INTO public.project_notes
      (project_id, author_id, content, note_type)
    VALUES (
      NEW.project_id,
      NEW.completed_by,
      'Task completed: ' || NEW.title,
      'task_complete'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_task_completion ON public.tasks;
CREATE TRIGGER log_task_completion
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_task_completion();


-- ---------------------------------------------------------------------------
-- log_stage_change — fires when a project's stage changes
-- Stage order for "promotion" detection (higher index = higher stage).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stage_order TEXT[] := ARRAY['inbox','someday','exploring','building','live','maintenance','archived'];
  old_idx     INT;
  new_idx     INT;
  is_win      BOOLEAN;
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    old_idx := array_position(stage_order, OLD.stage);
    new_idx := array_position(stage_order, NEW.stage);
    -- Promotion = moving to a higher-ranked stage (live/building are the peaks)
    is_win := new_idx > old_idx;

    INSERT INTO public.activity_log
      (project_id, actor_id, action, description, metadata, is_win)
    VALUES (
      NEW.id,
      NEW.updated_by,
      'stage_change',
      'Stage changed from ' || OLD.stage || ' to ' || NEW.stage,
      jsonb_build_object('from', OLD.stage, 'to', NEW.stage),
      is_win
    );

    INSERT INTO public.project_notes
      (project_id, author_id, content, note_type)
    VALUES (
      NEW.id,
      NEW.updated_by,
      'Stage changed from ' || OLD.stage || ' to ' || NEW.stage,
      'stage_change'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_stage_change ON public.projects;
CREATE TRIGGER log_stage_change
  AFTER UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_stage_change();


-- ---------------------------------------------------------------------------
-- log_project_creation — fires when a project row is inserted
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_log_project_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_log
    (project_id, actor_id, action, description, is_win)
  VALUES (
    NEW.id,
    NEW.created_by,
    'project_created',
    'Project created: ' || NEW.name,
    FALSE
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_project_creation ON public.projects;
CREATE TRIGGER log_project_creation
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_project_creation();


-- ---------------------------------------------------------------------------
-- enforce_pin_limit — at most 3 pinned projects at any time
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_enforce_pin_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pinned_count INT;
BEGIN
  -- Only check when pinned is being set to TRUE
  IF NEW.pinned = TRUE AND (OLD.pinned IS DISTINCT FROM TRUE) THEN
    SELECT COUNT(*) INTO pinned_count
    FROM public.projects
    WHERE pinned = TRUE AND id != NEW.id;

    IF pinned_count >= 3 THEN
      RAISE EXCEPTION 'Cannot pin more than 3 projects. Unpin an existing project first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pin_limit ON public.projects;
CREATE TRIGGER enforce_pin_limit
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_pin_limit();


-- ===========================================================================
-- REALTIME
-- ===========================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.projects,
  public.tasks,
  public.personal_tasks,
  public.project_notes,
  public.activity_log;
