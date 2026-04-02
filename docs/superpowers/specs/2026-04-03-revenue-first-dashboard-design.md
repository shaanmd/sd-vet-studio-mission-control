# SD VetStudio — Revenue-First Business Dashboard

## Overview

A complete rebuild of Mission Control with **revenue impact as the core organising principle**. The app answers one question above all others: *"What's my highest money-making move right now?"*

**Scope:** SD VetStudio only. Clinical businesses (Vet Align, MVN) are out of scope — this tool is for the digital product business.

**Users:** Dr Shaan Mocke and Dr Deb Prattley. Both have full access to everything — since the app is SD VetStudio-only, there is no permission split needed.

**Core pain point solved:** With AuDHD and multiple projects on the go, it's hard to know which task will have the most financial impact. Every view in this app is designed to surface revenue-priority work before anything else.

---

## Architecture

### Tech Stack

- **Frontend:** Next.js 15 + Tailwind CSS 4 + TypeScript (existing stack retained)
- **Backend/DB:** Supabase — auth, PostgreSQL, real-time subscriptions, edge functions
- **AI:** Anthropic Claude API (`claude-sonnet-4-6`) — next step suggestions, win summaries
- **Integrations:** GitHub REST API, Vercel REST API, Slack API
- **Deployment:** Vercel (existing)
- **PWA:** Installable on iOS/Android, offline read access

### Migration approach

Keep the existing Next.js + Supabase + Vercel foundation (auth, deployment config, edge function setup). Replace the data model, all pages, and navigation from scratch. This is a rebuild, not an incremental feature addition — the old schema is discarded.

### Authentication

Supabase Auth with email/password. Invite-only — Shaan and Deb only. No public signup.

---

## Revenue Scoring

Revenue scoring is the central concept that makes this app different from a standard project manager.

**How it works:**
- Every project is assigned a revenue score manually: 💰 (low), 💰💰 (medium), or 💰💰💰 (high)
- The score represents the relative money-making potential of the project — not a precise dollar figure
- Tasks inherit their project's revenue score for sorting purposes
- The home screen "money moves" list is sorted by revenue score (💰💰💰 first), then by energy level

**Revenue streams tracked (manual entry):**
- Course sales
- App subscriptions (SDVetRoute, SDVetScribe)
- In-app purchases / tokens (Colour My Pony via Google Play)
- Consulting
- Sponsorships
- Affiliate revenue
- Other

---

## Pages & Navigation

Bottom nav (mobile) / sidebar (desktop):

| Route | Icon | Screen |
|-------|------|--------|
| `/` | 🏠 | Home — Revenue Dashboard |
| `/projects` | 📂 | Projects |
| `/projects/[id]` | — | Project Detail |
| `/finance` | 💰 | Finance |
| `/marketing` | 📣 | Marketing |
| `/leads` | 🎯 | Leads |
| `/log` | 🏆 | Log & Win Wall |
| `/resources` | 🔗 | Resources |
| `/settings` | ⚙️ | Settings |

---

## Screen Designs

### 1. Home — Revenue Dashboard

The most important screen. Answers: *"What should I do next to make money?"*

**Layout (top to bottom):**

1. **Revenue snapshot** — three tiles showing:
   - Today's revenue (manual, from Finance log)
   - This month's revenue (auto-summed from Finance log)
   - Google Play / token revenue (manual, from Finance log)
   These update whenever a revenue entry is logged. They are motivating dopamine hits, not live API data.

2. **"Your Money Moves"** — ranked list of tasks across all active projects, sorted by:
   - Revenue score (💰💰💰 first)
   - Then energy level (surface low-energy tasks for tired moments)
   Sort order: (1) pinned project tasks first, (2) revenue score descending, (3) is_next_step = true, (4) energy level.
   Each item shows: task title, project name, revenue score, energy tag (⚡ High / ☕ Medium / 🛋️ Low), assigned to (Shaan / Deb / Both).
   Tapping reveals quick actions: Done, Skip, View project.

3. **Quick actions** — Quick Add Idea, All Projects, Log Revenue

4. **Win streak** — a small counter showing tasks completed this week. Tap to open Win Wall.

**Theme:** Cream background (#F5F0E8), white cards, teal (#1E6B5E) accents, gold (#D4A853) for revenue highlights.

---

### 2. Projects

Full portfolio with GTD lifecycle filtering.

**Sections:**
1. Search bar + "+ New Project" button
2. Filter pills: All, 📥 Inbox, 💤 Someday/Maybe, 🔍 Exploring, 🔨 Building, 🟢 Live, 🔧 Maintenance
3. Project cards grouped by stage, each showing: emoji, name, revenue score (💰/💰💰/💰💰💰), last activity, next step snippet

**Project creation modal:**
- Name (required)
- One-line description (optional)
- Revenue score (💰 / 💰💰 / 💰💰💰)
- Revenue stream type (course / subscription / in-app / consulting / sponsorship / affiliate / other)
- Stage (defaults to Inbox)

---

### 3. Project Detail

Full information for a single project.

**Sections:**
1. **Header** — name, emoji, stage badge (tappable), revenue score, pin button (pinning a project boosts its tasks to the top of the Home "Money Moves" list regardless of energy level — useful for sprint focus)
2. **Summary** — editable plain English description
3. **Next Step** — gold-highlighted, the ONE task that moves the project forward
4. **Full Task List** — checkbox, title, assigned to, energy tag, NEXT badge. Completed tasks at bottom crossed out. Inline add/edit.
5. **Key Links** — tappable grid: GitHub, Vercel, Live Site, plus manual links (Design Doc, Canva, etc.)
6. **Auto Status** — last GitHub commit, deploy status from Vercel (hourly cache)
7. **Finance** — mini expense/revenue log scoped to this project. Shows project total spend, project total revenue, and a mini P&L. "+ Log Expense" and "+ Log Revenue" buttons open the same form as the Finance section but pre-filled with this project.
8. **AI Project Analysis** — a panel showing the output from the [SD VetStudio Project Prioritizer](https://sooper-dooper-project-prioritizer.vercel.app/). Stored per-project after the user runs it. Displays:
   - **Income potential** — the tool's assessment of revenue opportunity
   - **Build difficulty** — complexity and effort estimate
   - **Overall recommendation** — the tool's priority verdict
   - "Last analysed: [date]" + "Re-analyse →" button (opens the prioritizer in a new tab pre-filled if possible, and a "Paste results" flow to save the output back)
   The analysis output is stored as structured text in the `project_analysis` table and displayed as a read-only card. Users run the analysis externally and paste/save results back — no API integration required.
9. **Notes & Log** — reverse-chronological feed of manual notes and auto-logged events (stage changes, task completions, deploys)
10. **Leads** — see Leads section below

---

### 4. Finance

Two tabs: **Expenses** and **Revenue**.

#### Expenses tab

**Summary bar:**
- Total expenses this month
- "Shaan paid: $X" — running tally of what Shaan has paid out of pocket for SD VetStudio
- "Deb paid: $Y" — running tally of what Deb has paid out of pocket for SD VetStudio
- These are simple tallies for future reconciliation when business accounts are established. No "owes" calculation.

**Filter pills:** All, Hosting, Domains, Subscriptions, Tools & AI, Marketing, Other

**Expense rows** — each showing: description, project (or "General"), category, date, amount, paid-by badge (Shaan / Deb / Split 50/50)

**Category breakdown** — collapsible summary showing total per category across all time

**Log Expense form:**
- Description (required)
- Amount (required)
- Category: Hosting / Domains / Subscriptions / Tools & AI / Marketing / Other
- Project: dropdown of all projects + "General" option
- Paid by: Shaan / Deb / Split 50/50
- Date (defaults to today)

#### Revenue tab

**Summary bar:**
- Total revenue this month
- Total revenue all time
- Revenue by stream (collapsible breakdown)

**Revenue rows** — each showing: description, project, revenue stream type, date, amount

**Log Revenue form:**
- Description (required, e.g. "VetScribe Pro — 3 new subscriptions")
- Amount (required)
- Revenue stream: Course / Subscription / In-app / Consulting / Sponsorship / Affiliate / Other
- Project (optional — some revenue may not map to a single project)
- Date (defaults to today)

---

### 5. Marketing

A launchpad and planning space — not a replacement for Canva, Blotato, or Content360.

**Sections:**
1. **Tool links** — quick-launch grid: Canva, Blotato, Meta Business Suite, Content360, CapCut, YouTube Studio
2. **Content calendar** — simple per-project view. Each row: project name, platform (Instagram / TikTok / Email / YouTube), scheduled date, content description, status (Draft / Scheduled / Published). "+ Add content item" opens inline form.
3. **Launch pipeline** — per project in Building/Live stage, a checklist of marketing milestones: email list notified, launch post scheduled, product hunt submitted, etc. Manual checklist, not auto-populated.

---

### 6. Leads & Pipeline

Lightweight CRM per project.

**Global view** — all leads across all projects, filterable by project and interest level.

**Per-lead record:**
- Name (required)
- Role / clinic
- Contact email / phone
- Source (e.g. "NZVA presentation", "Instagram DM")
- Interest level: 🔥 Hot / 👍 Warm / 🤷 Curious
- Project
- Added by (Shaan / Deb)
- Date added
- Notes feed (timestamped entries per lead)

**Beta tester promotion** — leads can be promoted to Beta Tester. Additional fields: invited date, accepted (yes / no / pending), app version, feedback status (Awaiting / Received / Follow-up needed).

**Revenue potential** — the Leads section header for each project shows: "X leads · estimated $Y if all convert" (based on the project's revenue stream type and a rough per-conversion estimate set on the project).

---

### 7. Log & Win Wall

Two tabs:

**Activity tab** — reverse-chronological feed of all events: task completions, stage changes, deploys, notes added, revenue logged. Filterable by person and project.

**Win Wall tab** — filtered to positive events only: completed tasks, launched projects, revenue milestones, stage promotions. AI-generated monthly summary: *"Here's what you shipped in March."* Empty state: *"Complete your first task and it'll show up here! 🎉"*

---

### 8. Resources

Shared links and logins hub. Categories: Dev & Deployment, Marketing & Content, AI Tools, Business, Brand, Contacts. Searchable. Editable from Settings.

**Pre-seeded AI Tools entry:** [SD VetStudio Project Prioritizer](https://sooper-dooper-project-prioritizer.vercel.app/) — analyses a project for income potential and build difficulty. Also surfaced via the "Re-analyse →" button on each Project Detail.

---

### 9. Settings

- Profile (name, email, avatar) — Shaan and Deb each manage their own
- Slack integration (workspace, channel, digest time)
- GitHub / Vercel API tokens
- Notification preferences
- Manage resources (add / edit / remove)
- Logout

---

## Data Model (Supabase)

```sql
-- Profiles (extended from Supabase Auth)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  avatar_url text,
  slack_user_id text,
  created_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text DEFAULT '📁',
  summary text,
  stage text NOT NULL DEFAULT 'inbox'
    CHECK (stage IN ('inbox', 'someday', 'exploring', 'building', 'live', 'maintenance', 'archived')),
  revenue_score text DEFAULT 'low'
    CHECK (revenue_score IN ('low', 'medium', 'high')),
  revenue_stream text
    CHECK (revenue_stream IN ('course', 'subscription', 'inapp', 'consulting', 'sponsorship', 'affiliate', 'other')),
  revenue_per_conversion numeric,     -- rough estimate for lead pipeline value
  pinned boolean DEFAULT false,
  github_repo text,
  vercel_project_id text,
  live_url text,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

-- Expenses
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  category text NOT NULL
    CHECK (category IN ('hosting', 'domains', 'subscriptions', 'tools_ai', 'marketing', 'other')),
  project_id uuid REFERENCES projects ON DELETE SET NULL,  -- NULL = General
  paid_by text NOT NULL
    CHECK (paid_by IN ('shaan', 'deb', 'split')),
  expense_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Revenue entries
CREATE TABLE revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  stream text NOT NULL
    CHECK (stream IN ('course', 'subscription', 'inapp', 'consulting', 'sponsorship', 'affiliate', 'other')),
  project_id uuid REFERENCES projects ON DELETE SET NULL,
  revenue_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

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

-- Lead Notes/Feedback
CREATE TABLE lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Marketing Content Calendar
CREATE TABLE content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects ON DELETE CASCADE,
  platform text NOT NULL
    CHECK (platform IN ('instagram', 'tiktok', 'email', 'youtube', 'other')),
  description text NOT NULL,
  scheduled_date date,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'published')),
  created_by uuid REFERENCES profiles(id),
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

-- Project Prioritizer Analysis (from sooper-dooper-project-prioritizer.vercel.app)
CREATE TABLE project_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects ON DELETE CASCADE,
  income_potential text,           -- e.g. "High — recurring subscription model with low churn risk"
  build_difficulty text,           -- e.g. "Medium — 4-6 weeks, existing auth can be reused"
  recommendation text,             -- e.g. "Prioritise — high ROI relative to effort"
  raw_output text,                 -- full paste from the tool for reference
  analysed_at timestamptz DEFAULT now(),
  analysed_by uuid REFERENCES profiles(id)
);

-- GitHub/Vercel cache (hourly refresh)
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

All tables: authenticated users only. Both Shaan and Deb have full read/write access to all data.

### Triggers

- On task completion → insert into `activity_log` (is_win = true) + `project_notes`
- On project stage change → insert into `activity_log` (is_win = true if promoted)
- On revenue entry logged → insert into `activity_log` (is_win = true)
- On project creation → insert into `activity_log`

---

## Integrations

### GitHub & Vercel
Supabase edge function runs hourly. Fetches last commit, open PRs, deploy status for all projects with `github_repo` / `vercel_project_id` set. Stored in `github_cache`.

### Slack Bot
All Slack interactions handled by Supabase edge functions (not Vercel routes).

**Daily digest:** Each person's top 3 money moves + revenue snapshot for the day.

**Slash commands:**
- `/mc add "idea"` → creates inbox project
- `/mc done "task name"` → marks task complete
- `/mc next ProjectName "task"` → sets project next step
- `/mc revenue $500 "VetScribe 3 new subs"` → logs revenue entry
- `/mc expense $25 "Supabase March" hosting` → logs expense

**Saturday reminder:** Out of scope for this version — a Sunday Review screen is a future enhancement.

### Claude API
- **Next step suggestion** — when a task is marked complete, AI suggests the next step based on project context
- **Auto energy tagging** — suggests energy level when a new task is created
- **Win Wall monthly summary** — narrative summary of the month's accomplishments
- **Smart Quick Add** — cleans up project name/summary and checks for duplicates on creation

Estimated cost: ~$3–5/month.

---

## Non-Goals

- No clinical business data (Vet Align, MVN)
- No TickTick integration — kept separate
- No live Stripe/Google Play API — revenue is manually logged
- No multi-tenant / public access
- No sprint planning, story points, or burndown charts
- No full accounting — Finance is a lightweight expense/revenue log, not a replacement for Xero
