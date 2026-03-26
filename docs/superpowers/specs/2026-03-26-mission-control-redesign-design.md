# SD VetStudio Mission Control — Design Spec

## Overview

Mission Control is a project management "second brain" for SD VetStudio — a two-person team (Dr Deb Prattley, veterinarian & educator, and Shaan Mocke, web designer/developer) building 50+ digital products in the veterinary and AI education space. Both are AuDHD GenX women who are also mobile vets, meaning they need a tool that works on mobile between patients, tells them exactly what to do next, and doesn't drain their limited mental energy.

### Core Pain Points Solved

1. **"Where did I leave off?"** — Open the app and instantly know the next step for each active project, without having to recall from memory.
2. **"Everything is scattered"** — One place with all key links, docs, status, and notes for every project.

### Design Philosophy

- **Tell me what to do, not everything I could do** — focused home screen, not a wall of options
- **Capture fast, organise later** — GTD inbox pattern for new ideas
- **Automate the boring stuff** — GitHub/Vercel status pulls automatically, AI pre-fills what it can
- **Mobile-first, desktop-great** — genuinely usable between patients on a phone
- **Low energy by default** — energy-tagged tasks let you pick work that matches your current capacity
- **Dopamine-friendly** — Win Wall, progress visibility, celebrations for completed work

## Architecture

### Tech Stack

- **Frontend:** Next.js 15 + Tailwind CSS 4 + TypeScript (upgrading existing stack to latest stable)
- **Backend/DB:** Supabase Pro ($10/mo) — auth, PostgreSQL, real-time subscriptions, edge functions, storage
- **AI:** Anthropic Claude API (claude-sonnet-4-6 for cost efficiency) — ~$5/mo estimated
- **Integrations:** GitHub REST API, Vercel REST API, Slack API (Bot + slash commands)
- **Deployment:** Vercel (existing)
- **PWA:** next-pwa or @serwist/next for installable mobile app with offline support

### Authentication

Supabase Auth with email/password. Invite-only — just Deb and Shaan. No public signup. Each user has a profile with their name and role used for task assignment and personalisation.

## Pages & Navigation

Bottom navigation bar (mobile) / sidebar (desktop):

| Route | Icon | Screen | Purpose |
|-------|------|--------|---------|
| `/` | 🏠 Home | "Right Now" view | What should I do next? |
| `/projects` | 📂 Projects | All Projects | Full portfolio with GTD filtering |
| `/projects/[id]` | — | Project Detail | Deep dive into one project |
| `/log` | ✏️ Log | Activity Log + Win Wall | Recent activity & accomplishments |
| `/resources` | 🔗 Resources | Shared Resources | Team logins, tools, contacts |
| `/settings` | ⚙️ Settings | Settings | Profile, Slack config, resource management, logout |
| `/review` | — | Weekly Review | Guided Sunday review flow |

## Screen Designs

### 1. Home Screen — "Right Now"

The most important screen. Answers: "What should I do next?"

**Sections (top to bottom):**

1. **Header** — "SD VetStudio Mission Control" + current date
2. **"Your Next 3"** — Deb/Shaan tabs. Each person sees their 3 priority personal tasks, manually curated from the `personal_tasks` table. These are separate from project-level tasks — they represent "the 3 things I should focus on today" and may or may not link to a project. Tasks show which project they belong to (if any). Shared tasks show a "Shaan too" or "Deb too" badge (determined by checking if both users have a `personal_task` pointing to the same `project_id`). Tapping a task reveals quick actions (complete, edit, reassign).
3. **"Focus Projects"** — Up to 3 pinned projects (enforced at UI level with a "you already have 3 pinned" message). Each card shows:
   - Project name + lifecycle stage badge
   - Auto-pulled status line (last commit time, deploy status) from GitHub/Vercel
   - **One "Next Step"** with who it's assigned to (the gold arrow) — this comes from the `tasks` table (`is_next_step = true`)
   - "Tap for full details + all tasks →" hint
4. **Quick Actions** — 3 buttons: Quick Add Idea, All Projects, Resources

**Relationship between "Your Next 3" and project "Next Step":** These are intentionally separate concepts. "Your Next 3" (`personal_tasks`) is your curated daily focus list — it might include things like "Email Francois about mentoring" that don't belong to any project. The project "Next Step" (`tasks.is_next_step`) is the ONE thing that moves a specific project forward. A personal task may reference the same work as a project's next step, but they're stored independently so you can curate your daily list without affecting project-level tracking.

**Theme:** Light — cream background (#F5F0E8) with white cards. Brand teal (#1E6B5E) for accents, gold (#D4A853) for next steps and highlights.

### 2. All Projects

Full portfolio view with GTD lifecycle filtering.

**Sections:**

1. **Header** — "All Projects" + total count
2. **Search bar** + "+ New" button
3. **Filter pills** — horizontally scrollable: All, 📥 Inbox, 💤 Someday/Maybe, 🔍 Exploring, 🔨 Building, 🟢 Live, 🔧 Maintenance. Each shows count.
4. **Project lists grouped by stage** — each project shows: emoji, name, last activity ("Shaan · 2h ago"), tap to open detail
5. **Inbox section** — highlighted with "NEEDS SORTING" badge. Each unsorted item has a "Sort →" button for quick triage into a stage.
6. **Someday/Maybe** — shows first 2-3 items then "13 more..." to avoid overwhelm

**Project creation flow ("+ New" button):**
Opens a bottom sheet (mobile) or modal (desktop) with:
- Project name (required, text input)
- One-line description (optional, text input — AI will expand this into a full summary if provided)
- Stage selector (defaults to Inbox, but can be set directly to any stage)
- "Create" button

After creation, navigates to the new project's detail page. If AI Smart Quick Add is enabled, a brief loading state shows while AI cleans up the name/summary and checks for duplicates. If a duplicate is detected, a banner appears: "This sounds similar to [Existing Project] — merge or keep separate?"

**Inbox triage flow ("Sort →" button):**
Tapping "Sort →" on an inbox item opens a compact bottom sheet with:
- Stage selector (6 pill buttons: Someday/Maybe, Exploring, Building, Live, Maintenance, or Archive)
- Tap a stage → item moves immediately with a brief success toast
- No other fields required — you can add details later from the project detail page
- This is intentionally minimal: sort now, detail later.

### 3. Project Detail

Full information about a single project. Accessed by tapping any project card.

**Sections:**

1. **Header** — back arrow, project name, lifecycle stage badge (tappable to change stage), start date. Pin/unpin button (⭐) to toggle focus project status.
2. **Summary** — plain English description of the project. Editable inline (tap to edit).
3. **Next Step (highlighted)** — the ONE task that levels up the project, with assignment. Gold background accent.
4. **Full Task List** — all tasks with:
   - Checkbox (tap to complete — on completion, AI suggests the next step)
   - Task name
   - Assigned to (Deb / Shaan / both)
   - "NEXT" badge on the designated next step
   - Energy tag (⚡ High / ☕ Medium / 🛋️ Low) on each task
   - Completed tasks shown crossed out at bottom
   - "+ Add" button → inline row appears with: task title input, assign toggle (Deb/Shaan/Both), save button. Energy tag is auto-suggested by AI after save.
   - Tap existing task to edit: same inline fields, plus option to promote to "Next Step" or delete
5. **Key Links** — 2x2 grid of tappable links. All links stored in `project_links` table. Default link types auto-created from `projects.github_repo` (→ GitHub Repo link), `projects.vercel_project_id` (→ Vercel Dashboard link), and `projects.live_url` (→ Live Site link). Additional links (Design Doc, Google Doc, Figma, etc.) added manually via "+ Add Link" button. Each link opens externally.
6. **Auto Status** — pulled from `github_cache` table (refreshed hourly by edge function):
   - Last commit (time + author) — from `github_cache.last_commit_at` and `last_commit_author`
   - Deployment status (✓ Live / ⚠️ Failed / 🔄 Building) — from `github_cache.deploy_status`
   - Open PRs count — from `github_cache.open_prs`
7. **Notes & Log** — reverse-chronological feed from `project_notes` table:
   - Manual notes from Deb or Shaan (with "+ Add Note" — opens a text input)
   - Auto-logged events (stage changes, deploys, task completions) — `note_type` field distinguishes these
   - Each entry shows author + timestamp

### 4. Activity Log + Win Wall

Two tabs within the Log screen:

**Activity tab:** Recent activity across all projects. Built by querying `activity_log` table (see Data Model). Shows task completions, notes added, deploys, stage changes. Each entry shows: icon, description, project name, who did it, when. Filterable by person and project.

**Win Wall tab:** Filtered view of `activity_log` showing only positive events: completed tasks, shipped projects (stage → Live), and stage promotions (Exploring → Building → Live). Visual proof of progress. AI-generated monthly summary: "Here's what you shipped in March." Dopamine on demand.

**Empty state:** "Nothing here yet — complete your first task and it'll show up here! 🎉"

### 5. Shared Resources

Central hub for all team logins, tools, and external links.

**Categories:**
- **Dev & Deployment** — GitHub, Vercel, Supabase, Google Play Console
- **Marketing & Content** — Canva, YouTube, Social accounts
- **AI Tools** — Claude/Anthropic, ChatGPT/OpenAI, Lovable
- **Business** — Finance App (placeholder), CRM (placeholder), Google Calendar, Slack
- **Brand** — Brand Kit, Photo Library
- **Contacts** — Team members, mentors (Francois du Plessis), NZVA contacts

Each link opens externally (↗). Searchable. Editable from Settings.

### 6. Weekly Review (Sunday Meeting Prep)

Guided flow for the Sunday meeting. AI pre-generates the agenda by scanning the week's activity.

**Flow:**
1. **AI Summary** — "This week: 12 tasks completed, 3 deploys, 2 new ideas added. Here's the breakdown:"
2. **Per focus project review** — for each of the 3 pinned projects:
   - What happened this week (auto-compiled from commits, tasks, notes)
   - Current next step — still right, or update?
   - Any blockers?
3. **Stale project check** — "These Building/Exploring projects had no activity: [list]. Keep or move to Someday/Maybe?"
4. **Inbox triage** — "You have 4 unsorted ideas. Quick sort?" (uses same bottom-sheet triage flow as All Projects)
5. **Set focus for next week** — confirm or change the 3 pinned focus projects
6. **Win recap** — "Here's what you accomplished this week 🎉" (feeds the Win Wall)

Slack reminder sent Saturday evening: "Sunday review is ready — tap to prep for your meeting."

### 7. Settings

- Profile (name, email, avatar)
- Slack integration setup (workspace connection, channel selection, digest time)
- Manage shared resources (add/edit/remove/reorder links)
- GitHub/Vercel API token configuration
- Notification preferences
- Logout

### Empty & First-Run States

On first login (no projects exist):
- **Home:** "Welcome to Mission Control! Start by adding your first project." with a prominent "+ Add Project" button and a "Quick import" option to bulk-add project names from a list.
- **Projects:** "No projects yet. Tap + New to add your first one."
- **Log:** "Nothing here yet — complete your first task and it'll show up here! 🎉"
- **Resources:** Pre-populated with common links (GitHub, Vercel, Supabase, etc.) that can be customised.

## Data Model (Supabase)

### Tables

```sql
-- Users (managed by Supabase Auth, extended with profiles)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,           -- "Deb" or "Shaan"
  role text,                    -- "Veterinarian & Educator" / "Web Designer/Developer"
  avatar_url text,
  slack_user_id text,
  created_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '📁',
  summary text,                 -- plain English description
  stage text NOT NULL DEFAULT 'inbox'
    CHECK (stage IN ('inbox', 'someday', 'exploring', 'building', 'live', 'maintenance', 'archived')),
  pinned boolean DEFAULT false,
  github_repo text,             -- e.g. "owner/repo-name"
  vercel_project_id text,
  live_url text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tasks (belong to a project)
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  title text NOT NULL,
  assigned_to uuid REFERENCES profiles(id),  -- NULL means "both"
  is_shared boolean DEFAULT false,           -- true when task is for both people
  is_next_step boolean DEFAULT false,
  energy text DEFAULT 'medium'
    CHECK (energy IN ('high', 'medium', 'low')),
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Personal Tasks (top 3 per person, may or may not link to a project)
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

-- Project Links (all key links for a project, including auto-generated ones)
CREATE TABLE project_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  label text NOT NULL,          -- "Live Site", "GitHub Repo", etc.
  url text NOT NULL,
  icon text DEFAULT '🔗',
  is_auto boolean DEFAULT false, -- true for links auto-derived from projects table
  sort_order integer DEFAULT 0
);

-- Project Notes
CREATE TABLE project_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),  -- NULL for auto-generated entries
  content text NOT NULL,
  note_type text DEFAULT 'note'
    CHECK (note_type IN ('note', 'stage_change', 'deploy', 'task_complete')),
  created_at timestamptz DEFAULT now()
);

-- Activity Log (unified cross-project activity feed)
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),   -- who did it (NULL for auto events)
  action text NOT NULL,                     -- 'task_completed', 'note_added', 'stage_changed', 'deployed', 'project_created', 'project_pinned'
  description text NOT NULL,               -- human-readable: "Completed: Wire up Supabase auth"
  metadata jsonb,                          -- optional structured data (old_stage, new_stage, task_id, etc.)
  is_win boolean DEFAULT false,            -- true for Win Wall items (completions, promotions, launches)
  created_at timestamptz DEFAULT now()
);

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

-- GitHub/Vercel Cache (auto-refreshed hourly)
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
```

### Row Level Security

All tables use RLS. Only authenticated users (Deb & Shaan) can read/write. No public access.

```sql
-- Example RLS policy (applied to all tables)
CREATE POLICY "Authenticated users have full access"
  ON projects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### Database Triggers

- **On task completion:** Insert into `activity_log` with `is_win = true`. Also insert into `project_notes` as auto-logged event.
- **On project stage change:** Insert into `activity_log` (with `is_win = true` if promoted to a higher stage). Update `projects.updated_at` and `updated_by`.
- **On project creation:** Insert into `activity_log`.
- **On pinned count enforcement:** Database function that checks `SELECT count(*) FROM projects WHERE pinned = true` before allowing a new pin. Returns error if already 3 pinned.

### Real-time

Supabase real-time subscriptions on `projects`, `tasks`, `personal_tasks`, `project_notes`, and `activity_log` so both users see updates live if they're both looking at the app.

## Integrations

### GitHub API

- **What:** Fetch last commit, open PRs, contributor activity per repo
- **How:** Supabase edge function runs hourly, iterates projects with `github_repo` set, updates `github_cache`
- **Auth:** GitHub personal access token stored in Supabase secrets

### Vercel API

- **What:** Fetch deployment status, preview URLs per project
- **How:** Same edge function as GitHub, queries Vercel API for projects with `vercel_project_id` set
- **Auth:** Vercel API token stored in Supabase secrets

### Slack API

Slack endpoint architecture: All Slack interactions (slash commands, events, bot messages) are handled by Supabase edge functions, NOT Vercel API routes. This keeps the Slack integration independent of the frontend deployment. Supabase edge functions provide publicly accessible HTTPS endpoints with sufficient response times for Slack's 3-second requirement.

- **Bot features:**
  - Daily morning digest (configurable time): sends each person their 3 personal tasks + 3 focus projects with next steps
  - Saturday evening reminder: "Sunday review is ready"
  - Deploy notifications: "6WSD just deployed ✓"
  - Stale project nudges: "VetRoute hasn't been touched in 14 days"

- **Slash commands:**
  - `/mc add "Voice transcription idea"` → creates inbox project
  - `/mc next VetRoute "Add mileage tracking"` → updates next step
  - `/mc done "Wire up auth"` → marks task complete

- **Natural language (AI-powered):**
  - Message the bot: "just finished the auth flow on 6WSD, next up is the quiz component"
  - AI parses intent → updates notes, marks task done, sets new next step

- **How:** Supabase edge functions as Slack event handlers. Slack app with bot token + slash command endpoints.

### Anthropic Claude API

Model: `claude-sonnet-4-6` (cost-efficient for small text tasks)

**AI Features:**

1. **Sunday Review Auto-Prep**
   - Trigger: Saturday evening (or on-demand)
   - Input: week's git commits, completed tasks, notes, deploy activity across all projects
   - Output: structured agenda with per-project summaries, stale project flags, inbox items to triage, win recap
   - Estimated cost: ~$0.02 per review

2. **Smart Quick Add**
   - Trigger: when user adds a new idea (from app or Slack)
   - Input: raw brain-dump text + list of existing project names/summaries
   - Output: cleaned-up project name, summary, and duplicate detection ("Similar to existing project X?")
   - Estimated cost: ~$0.005 per idea

3. **Next Step Suggestions**
   - Trigger: when a task is marked complete on a project
   - Input: project summary, remaining tasks, recent notes
   - Output: suggested next step (user taps to accept or edit)
   - Estimated cost: ~$0.005 per suggestion

4. **Auto Energy Tagging**
   - Trigger: when a new task is created
   - Input: task title + project context
   - Output: suggested energy level (high/medium/low)
   - Estimated cost: ~$0.001 per task

5. **Natural Language Slack Processing**
   - Trigger: when a message is sent to the Slack bot that isn't a slash command
   - Input: message text + project list for matching
   - Output: structured intent (which project, what action, what content)
   - Estimated cost: ~$0.005 per message

6. **Win Wall Monthly Summary**
   - Trigger: first of each month
   - Input: all completed tasks, shipped projects, stage promotions from the month
   - Output: encouraging narrative summary of accomplishments
   - Estimated cost: ~$0.02 per summary

**Estimated total AI cost: $3-5/month** at typical two-person usage.

## PWA Configuration

- Service worker for offline caching of app shell and recent data
- Web app manifest with SD VetStudio branding (teal theme, paw icon)
- Installable on iOS and Android home screens
- Offline mode: read-only access to cached projects and tasks. Writes queue and sync when back online. Conflict resolution: last-write-wins (acceptable for a 2-person team with low likelihood of simultaneous offline edits to the same item).
- Push notifications: supported on Android PWA and desktop browsers. iOS PWA push notifications require the app to be added to the home screen and have limited reliability — Slack notifications are the primary notification channel for reliability.

## Stale Project Nudges

Automated checks via Supabase edge function (daily):

- Projects in `building` or `exploring` with no task completions, notes, or commits in 14 days → flag as stale
- Projects in `live` stage are NOT flagged as stale (they are shipped and expected to be quiet unless in active development)
- Notification via Slack: "VetRoute hasn't been touched in 14 days — still building, or move to Someday/Maybe?"
- Shown in the Sunday Review flow
- Not applied to `someday`, `inbox`, `live`, or `maintenance` stages (those are expected to be quiet)

## Non-Goals (Explicitly Out of Scope)

- **Not a full PM tool** — no kanban boards, sprints, story points, burndown charts
- **Not a CRM** — links out to a future CRM tool
- **Not a finance app** — links out to a future finance tool
- **Not a code editor** — links to GitHub for code work
- **Not multi-tenant** — this is for Deb and Shaan only
- **No complex permissions** — both users have full access to everything
