# Mission Control Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Supabase backend, authentication, database schema, shared layout with responsive navigation, and the Supabase client — the foundation everything else builds on.

**Architecture:** Next.js 15 app with Supabase Pro for auth + PostgreSQL. Mobile-first responsive layout with bottom nav (mobile) and sidebar (desktop). All data flows through Supabase client with RLS enforcing auth.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase (auth, PostgreSQL, real-time), @supabase/supabase-js, @supabase/ssr

**Spec:** `docs/superpowers/specs/2026-03-26-mission-control-redesign-design.md`

---

### Task 1: Install Dependencies and Configure Supabase

**Files:**
- Modify: `package.json`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`
- Modify: `.env.local` (not committed)
- Create: `.env.example`

- [ ] **Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create environment variable example file**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Create `.env.local` with real Supabase credentials**

The user must provide their Supabase project URL and anon key from the Supabase dashboard (Settings → API).

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<from-supabase-dashboard>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from-supabase-dashboard>
```

- [ ] **Step 4: Create Supabase browser client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Create Supabase server client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 6: Create Supabase middleware helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 7: Create Next.js middleware**

Create `middleware.ts` (project root):
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 8: Add .env.local to .gitignore (verify it's there)**

Check `.gitignore` already has `.env*.local`. If not, add it.

- [ ] **Step 9: Verify the dev server starts**

Run: `npm run dev`
Expected: Server starts without errors (will redirect to /login which doesn't exist yet — that's fine)

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json lib/supabase/ middleware.ts .env.example
git commit -m "feat: add Supabase client setup and auth middleware"
```

---

### Task 2: Database Schema — Create All Tables in Supabase

**Files:**
- Create: `supabase/schema.sql` (reference file, applied via Supabase dashboard or CLI)

This SQL is run in the Supabase SQL Editor (Dashboard → SQL Editor → New query). The file is saved locally as a reference.

- [ ] **Step 1: Create the schema SQL file**

Create `supabase/schema.sql` with all tables from the spec:
```sql
-- ============================================
-- SD VetStudio Mission Control — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  avatar_url text,
  slack_user_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON profiles
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '📁',
  summary text,
  stage text NOT NULL DEFAULT 'inbox'
    CHECK (stage IN ('inbox', 'someday', 'exploring', 'building', 'live', 'maintenance', 'archived')),
  pinned boolean DEFAULT false,
  github_repo text,
  vercel_project_id text,
  live_url text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON projects
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  title text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),
  is_shared boolean DEFAULT false,
  is_next_step boolean DEFAULT false,
  energy text DEFAULT 'medium'
    CHECK (energy IN ('high', 'medium', 'low')),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON tasks
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Personal Tasks
CREATE TABLE personal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id),
  project_id uuid REFERENCES projects ON DELETE SET NULL,
  energy text DEFAULT 'medium'
    CHECK (energy IN ('high', 'medium', 'low')),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personal_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON personal_tasks
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Project Links
CREATE TABLE project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  icon text DEFAULT '🔗',
  is_auto boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON project_links
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Project Notes
CREATE TABLE project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  note_type text DEFAULT 'note'
    CHECK (note_type IN ('note', 'stage_change', 'deploy', 'task_complete')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON project_notes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Activity Log
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  is_win boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON activity_log
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Shared Resources
CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL
    CHECK (category IN ('dev', 'marketing', 'ai', 'business', 'brand', 'contacts')),
  name text NOT NULL,
  description text,
  url text,
  icon text DEFAULT '🔗',
  sort_order integer DEFAULT 0
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON resources
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Leads
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  name text NOT NULL,
  role_clinic text,
  contact_email text,
  contact_phone text,
  source text,
  interest_level text DEFAULT 'warm'
    CHECK (interest_level IN ('hot', 'warm', 'curious')),
  is_beta_tester boolean DEFAULT false,
  beta_invited_at timestamptz,
  beta_accepted text CHECK (beta_accepted IN ('yes', 'no', 'pending')),
  beta_app_version text,
  beta_feedback_status text DEFAULT 'awaiting'
    CHECK (beta_feedback_status IN ('awaiting', 'received', 'follow_up')),
  added_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON leads
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Lead Feedback
CREATE TABLE lead_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lead_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON lead_feedback
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- GitHub/Vercel Cache
CREATE TABLE github_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects ON DELETE CASCADE,
  last_commit_message text,
  last_commit_author text,
  last_commit_at timestamptz,
  open_prs integer DEFAULT 0,
  deploy_status text CHECK (deploy_status IN ('ready', 'building', 'error')),
  deploy_url text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE github_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users have full access" ON github_cache
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- Database Triggers
-- ============================================

-- Auto-update updated_at on projects
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Log task completion to activity_log and project_notes
CREATE OR REPLACE FUNCTION log_task_completion()
RETURNS trigger AS $$
BEGIN
  IF NEW.completed = true AND (OLD.completed = false OR OLD.completed IS NULL) THEN
    INSERT INTO activity_log (project_id, actor_id, action, description, metadata, is_win)
    VALUES (
      NEW.project_id,
      NEW.completed_by,
      'task_completed',
      'Completed: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id),
      true
    );
    INSERT INTO project_notes (project_id, author_id, content, note_type)
    VALUES (
      NEW.project_id,
      NEW.completed_by,
      'Completed task: ' || NEW.title,
      'task_complete'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completed
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_task_completion();

-- Log project stage changes
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS trigger AS $$
DECLARE
  stage_order jsonb := '{"inbox":0,"someday":1,"exploring":2,"building":3,"live":4,"maintenance":5,"archived":6}'::jsonb;
  is_promotion boolean;
BEGIN
  IF NEW.stage <> OLD.stage THEN
    is_promotion := (stage_order->>NEW.stage)::int > (stage_order->>OLD.stage)::int;
    INSERT INTO activity_log (project_id, actor_id, action, description, metadata, is_win)
    VALUES (
      NEW.id,
      NEW.updated_by,
      'stage_changed',
      NEW.name || ': ' || OLD.stage || ' → ' || NEW.stage,
      jsonb_build_object('old_stage', OLD.stage, 'new_stage', NEW.stage),
      is_promotion
    );
    INSERT INTO project_notes (project_id, author_id, content, note_type)
    VALUES (
      NEW.id,
      NEW.updated_by,
      'Stage changed: ' || OLD.stage || ' → ' || NEW.stage,
      'stage_change'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_stage_changed
  AFTER UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION log_stage_change();

-- Log project creation
CREATE OR REPLACE FUNCTION log_project_creation()
RETURNS trigger AS $$
BEGIN
  INSERT INTO activity_log (project_id, actor_id, action, description, is_win)
  VALUES (
    NEW.id,
    NEW.created_by,
    'project_created',
    'Created project: ' || NEW.name,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION log_project_creation();

-- Enforce max 3 pinned projects
CREATE OR REPLACE FUNCTION enforce_pin_limit()
RETURNS trigger AS $$
BEGIN
  IF NEW.pinned = true AND OLD.pinned = false THEN
    IF (SELECT count(*) FROM projects WHERE pinned = true AND id <> NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 pinned projects allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_pins
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION enforce_pin_limit();

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE personal_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE project_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;
```

- [ ] **Step 2: Run the schema in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → New query → Paste the contents of `supabase/schema.sql` → Run.

Expected: All tables, triggers, and policies created successfully.

- [ ] **Step 3: Create two user accounts in Supabase**

Go to Supabase Dashboard → Authentication → Users → Invite user:
- Deb: deb@sdvetstudio.com (or real email)
- Shaan: shaan@sdvetstudio.com (or real email)

After both users are created, update their profiles:
```sql
UPDATE profiles SET name = 'Deb', role = 'Veterinarian & Educator' WHERE id = '<deb-user-id>';
UPDATE profiles SET name = 'Shaan', role = 'Web Designer / Developer' WHERE id = '<shaan-user-id>';
```

- [ ] **Step 4: Commit the schema file**

```bash
git add supabase/schema.sql
git commit -m "feat: add complete database schema with RLS, triggers, and realtime"
```

---

### Task 3: TypeScript Types for Database

**Files:**
- Create: `lib/types/database.ts`

- [ ] **Step 1: Create TypeScript types matching the database schema**

Create `lib/types/database.ts`:
```typescript
export type Stage = 'inbox' | 'someday' | 'exploring' | 'building' | 'live' | 'maintenance' | 'archived'
export type Energy = 'high' | 'medium' | 'low'
export type InterestLevel = 'hot' | 'warm' | 'curious'
export type BetaAccepted = 'yes' | 'no' | 'pending'
export type BetaFeedbackStatus = 'awaiting' | 'received' | 'follow_up'
export type NoteType = 'note' | 'stage_change' | 'deploy' | 'task_complete'
export type DeployStatus = 'ready' | 'building' | 'error'
export type ResourceCategory = 'dev' | 'marketing' | 'ai' | 'business' | 'brand' | 'contacts'
export type ActivityAction = 'task_completed' | 'note_added' | 'stage_changed' | 'deployed' | 'project_created' | 'project_pinned'

export interface Profile {
  id: string
  name: string
  role: string | null
  avatar_url: string | null
  slack_user_id: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  emoji: string
  summary: string | null
  stage: Stage
  pinned: boolean
  github_repo: string | null
  vercel_project_id: string | null
  live_url: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  assigned_to: string | null
  is_shared: boolean
  is_next_step: boolean
  energy: Energy
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
}

export interface PersonalTask {
  id: string
  title: string
  owner_id: string
  project_id: string | null
  energy: Energy
  completed: boolean
  completed_at: string | null
  sort_order: number
  created_at: string
}

export interface ProjectLink {
  id: string
  project_id: string
  label: string
  url: string
  icon: string
  is_auto: boolean
  sort_order: number
}

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string | null
  content: string
  note_type: NoteType
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  project_id: string | null
  actor_id: string | null
  action: ActivityAction
  description: string
  metadata: Record<string, unknown> | null
  is_win: boolean
  created_at: string
}

export interface Resource {
  id: string
  category: ResourceCategory
  name: string
  description: string | null
  url: string | null
  icon: string
  sort_order: number
}

export interface Lead {
  id: string
  project_id: string
  name: string
  role_clinic: string | null
  contact_email: string | null
  contact_phone: string | null
  source: string | null
  interest_level: InterestLevel
  is_beta_tester: boolean
  beta_invited_at: string | null
  beta_accepted: BetaAccepted | null
  beta_app_version: string | null
  beta_feedback_status: BetaFeedbackStatus
  added_by: string | null
  created_at: string
}

export interface LeadFeedback {
  id: string
  lead_id: string
  author_id: string | null
  content: string
  created_at: string
}

export interface GitHubCache {
  id: string
  project_id: string
  last_commit_message: string | null
  last_commit_author: string | null
  last_commit_at: string | null
  open_prs: number
  deploy_status: DeployStatus | null
  deploy_url: string | null
  updated_at: string
}

// Joined types for UI convenience
export interface ProjectWithDetails extends Project {
  tasks?: Task[]
  next_step?: Task | null
  links?: ProjectLink[]
  github_cache?: GitHubCache | null
}

export interface PersonalTaskWithProject extends PersonalTask {
  project?: Pick<Project, 'id' | 'name' | 'emoji'> | null
}

export interface ActivityLogWithDetails extends ActivityLogEntry {
  project?: Pick<Project, 'id' | 'name' | 'emoji'> | null
  actor?: Pick<Profile, 'id' | 'name'> | null
}

export interface ProjectNoteWithAuthor extends ProjectNote {
  author?: Pick<Profile, 'id' | 'name'> | null
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types/database.ts
git commit -m "feat: add TypeScript types for all database tables"
```

---

### Task 4: Login Page

**Files:**
- Create: `app/login/page.tsx`

- [ ] **Step 1: Create the login page**

Create `app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🐾</div>
          <h1 className="text-2xl font-bold text-[#2C3E50]">Mission Control</h1>
          <p className="text-sm text-[#8899a6] mt-1">SD VetStudio</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-[#2C3E50] mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-[#2C3E50] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] focus:border-transparent"
              placeholder="you@sdvetstudio.com"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-[#2C3E50] mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-[#2C3E50] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#1E6B5E] text-white font-semibold text-sm hover:bg-[#185a4f] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify login page renders**

Run: `npm run dev`
Navigate to: `http://localhost:3000/login`
Expected: Login form with SD VetStudio branding appears.

- [ ] **Step 3: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: add login page with Supabase auth"
```

---

### Task 5: Auth Context Provider

**Files:**
- Create: `lib/hooks/use-auth.tsx`

- [ ] **Step 1: Create auth context and hook**

Create `lib/hooks/use-auth.tsx`:
```tsx
'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'
import type { User } from '@supabase/supabase-js'

interface AuthContext {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContext>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()
          setProfile(data)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/hooks/use-auth.tsx
git commit -m "feat: add auth context provider and useAuth hook"
```

---

### Task 6: App Shell — Layout with Responsive Navigation

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/AppShell.tsx`
- Create: `components/BottomNav.tsx`
- Create: `components/Sidebar.tsx`
- Modify: `app/globals.css`
- Remove: old components (`components/HighlightsPanel.tsx`, `components/DailyTasks.tsx`, `components/PlanningSection.tsx`, `components/ProjectsSection.tsx`, `components/DropdownSection.tsx`, `components/ContactsPanel.tsx`)
- Remove: `config/dashboard.ts`
- Modify: `app/page.tsx` (replace with placeholder)

- [ ] **Step 1: Create the BottomNav component (mobile)**

Create `components/BottomNav.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/projects', icon: '📂', label: 'Projects' },
  { href: '/log', icon: '✏️', label: 'Log' },
  { href: '/resources', icon: '🔗', label: 'Resources' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/8 flex md:hidden z-50">
      {navItems.map((item) => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center py-3 text-[11px] transition-colors ${
              isActive
                ? 'text-[#1E6B5E] font-semibold'
                : 'text-[#8899a6]'
            }`}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Create the Sidebar component (desktop)**

Create `components/Sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/projects', icon: '📂', label: 'Projects' },
  { href: '/log', icon: '✏️', label: 'Log' },
  { href: '/resources', icon: '🔗', label: 'Resources' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-56 flex-col bg-white border-r border-black/8 h-screen sticky top-0">
      <div className="p-5 border-b border-black/8">
        <div className="text-xs uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          SD VetStudio
        </div>
        <div className="text-lg font-bold text-[#2C3E50]">Mission Control</div>
      </div>

      <nav className="flex-1 p-3">
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                isActive
                  ? 'bg-[#1E6B5E]/10 text-[#1E6B5E] font-semibold'
                  : 'text-[#2C3E50] hover:bg-black/5'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Create the AppShell wrapper**

Create `components/AppShell.tsx`:
```tsx
'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/hooks/use-auth'
import { BottomNav } from '@/components/BottomNav'
import { Sidebar } from '@/components/Sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-[#F5F0E8]">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  )
}
```

- [ ] **Step 4: Update the root layout**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import './globals.css'

export const metadata: Metadata = {
  title: 'SD VetStudio Mission Control',
  description: 'Project management second brain for SD VetStudio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Replace the home page with a placeholder**

Replace `app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[2px] text-[#1E6B5E] font-semibold md:hidden">
            SD VetStudio
          </div>
          <h1 className="text-xl font-bold text-[#2C3E50]">
            <span className="md:hidden">Mission Control</span>
            <span className="hidden md:inline">Home</span>
          </h1>
        </div>
        <div className="text-sm text-[#8899a6]">
          {new Date().toLocaleDateString('en-NZ', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
        <div className="text-4xl mb-3">🐾</div>
        <h2 className="text-lg font-semibold text-[#2C3E50] mb-2">
          Welcome to Mission Control!
        </h2>
        <p className="text-sm text-[#8899a6]">
          Your second brain is being built. Home screen coming soon.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create placeholder pages for all routes**

Create `app/projects/page.tsx`:
```tsx
export default function ProjectsPage() {
  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">All Projects</h1>
      <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
        <p className="text-sm text-[#8899a6]">Coming soon.</p>
      </div>
    </div>
  )
}
```

Create `app/log/page.tsx`:
```tsx
export default function LogPage() {
  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Activity Log</h1>
      <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
        <p className="text-sm text-[#8899a6]">Nothing here yet — complete your first task and it'll show up here! 🎉</p>
      </div>
    </div>
  )
}
```

Create `app/resources/page.tsx`:
```tsx
export default function ResourcesPage() {
  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Resources</h1>
      <div className="bg-white rounded-2xl border border-black/5 p-8 text-center">
        <p className="text-sm text-[#8899a6]">Coming soon.</p>
      </div>
    </div>
  )
}
```

Create `app/settings/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { profile, signOut } = useAuth()
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="p-5">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Settings</h1>
      <div className="bg-white rounded-2xl border border-black/5 p-6">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#2C3E50] mb-2">Profile</h2>
          <p className="text-sm text-[#8899a6]">{profile?.name ?? 'Loading...'}</p>
          <p className="text-xs text-[#8899a6]">{profile?.role}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Remove old static components and config**

Delete these files (they are replaced by the new dynamic system):
- `components/HighlightsPanel.tsx`
- `components/DailyTasks.tsx`
- `components/PlanningSection.tsx`
- `components/ProjectsSection.tsx`
- `components/DropdownSection.tsx`
- `components/ContactsPanel.tsx`
- `config/dashboard.ts`

- [ ] **Step 8: Verify the app builds and runs**

Run: `npm run build`
Expected: Build succeeds with no errors.

Run: `npm run dev`
Expected: App shows login page. After login, shows the app shell with sidebar (desktop) / bottom nav (mobile) and placeholder pages.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add app shell with responsive nav, auth, and placeholder pages

Replace static dashboard with authenticated app shell.
Bottom nav on mobile, sidebar on desktop.
Placeholder pages for all routes."
```

---

## Phase 1 Complete Checklist

After completing all 6 tasks, you should have:

- [ ] Supabase client configured (browser + server + middleware)
- [ ] All database tables created with RLS and triggers
- [ ] TypeScript types for all tables
- [ ] Login page with Supabase auth
- [ ] Auth context provider with useAuth hook
- [ ] Responsive app shell (sidebar desktop, bottom nav mobile)
- [ ] Placeholder pages for all routes (/, /projects, /log, /resources, /settings)
- [ ] Old static components removed
- [ ] App builds and runs without errors

**Next phase:** Phase 2 — Core Pages (Home screen, All Projects, Project Detail)
