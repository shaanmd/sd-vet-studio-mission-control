# Revenue-First Dashboard — Phase 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Supabase schema, establish TypeScript types, add the revenue-sort utility with tests, and rebuild the navigation shell with all 8 routes rendering stubs — leaving a working app skeleton ready for Phase 2.

**Architecture:** Additive Supabase migration (drop unused tables, add new ones, modify projects table). TypeScript types in `lib/types.ts`. Revenue sorting logic isolated in `lib/revenue.ts` for easy testing. Navigation shell updated with new Finance, Marketing, Leads routes.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase, Vitest, React Testing Library

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260403000000_revenue_dashboard_rebuild.sql` | Full schema migration |
| Create/Replace | `lib/types.ts` | All TypeScript types for every DB table |
| Create | `lib/revenue.ts` | Revenue score sorting utility |
| Create | `lib/__tests__/revenue.test.ts` | Unit tests for sort logic |
| Modify | `package.json` | Add vitest, @vitest/ui, @testing-library/react |
| Create | `vitest.config.ts` | Vitest config |
| Modify | `components/AppShell.tsx` | Updated shell with new route structure |
| Modify | `components/BottomNav.tsx` | 5-item mobile nav: Home, Projects, Finance, Leads, Log |
| Modify | `components/Sidebar.tsx` | All 8 routes on desktop |
| Create | `app/finance/page.tsx` | Finance stub |
| Create | `app/marketing/page.tsx` | Marketing stub |
| Create | `app/leads/page.tsx` | Leads stub |
| Modify | `app/page.tsx` | Home stub (Revenue Dashboard placeholder) |
| Modify | `app/projects/page.tsx` | Projects stub |
| Modify | `app/log/page.tsx` | Log stub |
| Modify | `app/resources/page.tsx` | Resources stub |
| Modify | `app/settings/page.tsx` | Settings stub |
| Modify | `public/manifest.json` | Updated PWA name + theme |

---

### Task 1: Supabase Schema Migration

**Files:**
- Create: `supabase/migrations/20260403000000_revenue_dashboard_rebuild.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260403000000_revenue_dashboard_rebuild.sql

-- ============================================================
-- PHASE 1: Drop tables from old schema no longer needed
-- ============================================================

DROP TABLE IF EXISTS personal_tasks CASCADE;
DROP TABLE IF EXISTS lead_feedback CASCADE;

-- ============================================================
-- PHASE 2: Modify existing tables
-- ============================================================

-- Add revenue fields to projects
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS revenue_score text DEFAULT 'low'
    CHECK (revenue_score IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS revenue_stream text
    CHECK (revenue_stream IN ('course', 'subscription', 'inapp', 'consulting', 'sponsorship', 'affiliate', 'other')),
  ADD COLUMN IF NOT EXISTS revenue_per_conversion numeric;

-- ============================================================
-- PHASE 3: Create new tables
-- ============================================================

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text NOT NULL
    CHECK (category IN ('hosting', 'domains', 'subscriptions', 'tools_ai', 'marketing', 'other')),
  project_id uuid REFERENCES projects ON DELETE SET NULL,
  paid_by text NOT NULL
    CHECK (paid_by IN ('shaan', 'deb', 'split')),
  expense_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  stream text NOT NULL
    CHECK (stream IN ('course', 'subscription', 'inapp', 'consulting', 'sponsorship', 'affiliate', 'other')),
  project_id uuid REFERENCES projects ON DELETE SET NULL,
  revenue_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid UNIQUE NOT NULL REFERENCES projects ON DELETE CASCADE,
  income_potential text,
  build_difficulty text,
  recommendation text,
  raw_output text,
  analysed_at timestamptz DEFAULT now(),
  analysed_by uuid REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS content_items (
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

CREATE TABLE IF NOT EXISTS lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads ON DELETE CASCADE,
  author_id uuid REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PHASE 4: RLS policies for new tables
-- ============================================================

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users have full access" ON expenses
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON revenue_entries
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON project_analysis
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON content_items
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access" ON lead_notes
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- PHASE 5: Activity log trigger for revenue entries
-- ============================================================

CREATE OR REPLACE FUNCTION log_revenue_entry()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log (project_id, actor_id, action, description, is_win)
  VALUES (
    NEW.project_id,
    NEW.created_by,
    'revenue_logged',
    'Revenue logged: ' || NEW.description || ' ($' || NEW.amount || ')',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_revenue_entry_created ON revenue_entries;
CREATE TRIGGER on_revenue_entry_created
  AFTER INSERT ON revenue_entries
  FOR EACH ROW EXECUTE FUNCTION log_revenue_entry();

-- ============================================================
-- PHASE 6: Seed Resources with SD VetStudio Project Prioritizer
-- ============================================================

INSERT INTO resources (category, name, description, url, icon, sort_order)
VALUES (
  'ai',
  'SD VetStudio Project Prioritizer',
  'Analyses a project for income potential and build difficulty',
  'https://sooper-dooper-project-prioritizer.vercel.app/',
  '🎯',
  1
)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Apply the migration via Supabase CLI**

```bash
npx supabase db push
```

Expected: migration applies cleanly with no errors. If you see FK errors on `lead_notes` referencing `leads`, ensure the `leads` table exists first (it does from old schema).

- [ ] **Step 3: Verify in Supabase dashboard**

Open Supabase Table Editor and confirm these tables exist: `expenses`, `revenue_entries`, `project_analysis`, `content_items`, `lead_notes`. Confirm `projects` table has columns `revenue_score`, `revenue_stream`, `revenue_per_conversion`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260403000000_revenue_dashboard_rebuild.sql
git commit -m "feat: revenue dashboard schema migration — new tables + revenue scoring on projects"
```

---

### Task 2: TypeScript Types

**Files:**
- Create/Replace: `lib/types.ts`

- [ ] **Step 1: Write the types file**

```typescript
// lib/types.ts

export type RevenueScore = 'low' | 'medium' | 'high'
export type RevenueStream = 'course' | 'subscription' | 'inapp' | 'consulting' | 'sponsorship' | 'affiliate' | 'other'
export type ProjectStage = 'inbox' | 'someday' | 'exploring' | 'building' | 'live' | 'maintenance' | 'archived'
export type EnergyLevel = 'high' | 'medium' | 'low'
export type InterestLevel = 'hot' | 'warm' | 'curious'
export type ExpenseCategory = 'hosting' | 'domains' | 'subscriptions' | 'tools_ai' | 'marketing' | 'other'
export type PaidBy = 'shaan' | 'deb' | 'split'
export type Platform = 'instagram' | 'tiktok' | 'email' | 'youtube' | 'other'
export type ContentStatus = 'draft' | 'scheduled' | 'published'
export type NoteType = 'note' | 'stage_change' | 'deploy' | 'task_complete'
export type BetaAccepted = 'yes' | 'no' | 'pending'
export type FeedbackStatus = 'awaiting' | 'received' | 'follow_up'
export type DeployStatus = 'ready' | 'building' | 'error'

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
  stage: ProjectStage
  revenue_score: RevenueScore
  revenue_stream: RevenueStream | null
  revenue_per_conversion: number | null
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
  energy: EnergyLevel
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  project_id: string | null
  paid_by: PaidBy
  expense_date: string
  created_by: string | null
  created_at: string
}

export interface RevenueEntry {
  id: string
  description: string
  amount: number
  stream: RevenueStream
  project_id: string | null
  revenue_date: string
  created_by: string | null
  created_at: string
}

export interface ProjectAnalysis {
  id: string
  project_id: string
  income_potential: string | null
  build_difficulty: string | null
  recommendation: string | null
  raw_output: string | null
  analysed_at: string
  analysed_by: string | null
}

export interface ContentItem {
  id: string
  project_id: string | null
  platform: Platform
  description: string
  scheduled_date: string | null
  status: ContentStatus
  created_by: string | null
  created_at: string
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
  beta_feedback_status: FeedbackStatus
  added_by: string | null
  created_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  author_id: string | null
  content: string
  created_at: string
}

export interface ProjectNote {
  id: string
  project_id: string
  author_id: string | null
  content: string
  note_type: NoteType
  created_at: string
}

export interface ActivityLog {
  id: string
  project_id: string | null
  actor_id: string | null
  action: string
  description: string
  metadata: Record<string, unknown> | null
  is_win: boolean
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

export interface Resource {
  id: string
  category: string
  name: string
  description: string | null
  url: string | null
  icon: string
  sort_order: number
}

export interface GithubCache {
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

// Composite type used by Home screen money moves list
export interface MoneyMove {
  task: Task
  project: Project
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: TypeScript types for revenue dashboard schema"
```

---

### Task 3: Vitest Setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest and testing library**

```bash
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 2: Create vitest config**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 3: Create vitest setup file**

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

Open `package.json` and add to the `"scripts"` section:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 5: Run tests to confirm setup works**

```bash
npm test
```

Expected: "No test files found" — that's fine, it means the setup is correct.

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json
git commit -m "feat: add vitest + testing library setup"
```

---

### Task 4: Revenue Sort Utility + Tests

**Files:**
- Create: `lib/revenue.ts`
- Create: `lib/__tests__/revenue.test.ts`

- [ ] **Step 1: Write the failing tests first**

```typescript
// lib/__tests__/revenue.test.ts
import { describe, it, expect } from 'vitest'
import { sortMoneyMoves } from '../revenue'
import type { Project, Task, MoneyMove } from '../types'

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Project',
  emoji: '📁',
  summary: null,
  stage: 'building',
  revenue_score: 'medium',
  revenue_stream: null,
  revenue_per_conversion: null,
  pinned: false,
  github_repo: null,
  vercel_project_id: null,
  live_url: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  project_id: 'p1',
  title: 'Test task',
  assigned_to: null,
  is_shared: false,
  is_next_step: false,
  energy: 'medium',
  completed: false,
  completed_at: null,
  completed_by: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const move = (taskOverrides: Partial<Task>, projectOverrides: Partial<Project>): MoneyMove => ({
  task: makeTask(taskOverrides),
  project: makeProject(projectOverrides),
})

describe('sortMoneyMoves', () => {
  it('puts pinned project tasks before unpinned, regardless of revenue score', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1' }, { id: 'p1', pinned: false, revenue_score: 'high' }),
      move({ id: 't2' }, { id: 'p2', pinned: true, revenue_score: 'low' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted[0].task.id).toBe('t2')
  })

  it('sorts by revenue score descending when pin status matches', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1' }, { revenue_score: 'low' }),
      move({ id: 't2' }, { revenue_score: 'high' }),
      move({ id: 't3' }, { revenue_score: 'medium' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted.map(m => m.task.id)).toEqual(['t2', 't3', 't1'])
  })

  it('puts is_next_step tasks before regular tasks at same revenue score', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1', is_next_step: false }, { revenue_score: 'high' }),
      move({ id: 't2', is_next_step: true }, { revenue_score: 'high' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted[0].task.id).toBe('t2')
  })

  it('surfaces low energy tasks first when score and next_step match', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1', energy: 'high', is_next_step: false }, { revenue_score: 'medium' }),
      move({ id: 't2', energy: 'low', is_next_step: false }, { revenue_score: 'medium' }),
      move({ id: 't3', energy: 'medium', is_next_step: false }, { revenue_score: 'medium' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted.map(m => m.task.id)).toEqual(['t2', 't3', 't1'])
  })

  it('returns empty array unchanged', () => {
    expect(sortMoneyMoves([])).toEqual([])
  })

  it('does not mutate the input array', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1' }, { revenue_score: 'low' }),
      move({ id: 't2' }, { revenue_score: 'high' }),
    ]
    const original = [...moves]
    sortMoneyMoves(moves)
    expect(moves[0].task.id).toBe(original[0].task.id)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — "Cannot find module '../revenue'"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/revenue.ts
import type { EnergyLevel, RevenueScore, MoneyMove } from './types'

const REVENUE_RANK: Record<RevenueScore, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const ENERGY_RANK: Record<EnergyLevel, number> = {
  low: 3,    // low-energy tasks surface first — easier to start
  medium: 2,
  high: 1,
}

/**
 * Sorts MoneyMove items for the Home screen list.
 * Order: pinned projects → revenue score (desc) → is_next_step → energy level (low first)
 */
export function sortMoneyMoves(moves: MoneyMove[]): MoneyMove[] {
  return [...moves].sort((a, b) => {
    // 1. Pinned projects first
    if (a.project.pinned !== b.project.pinned) {
      return a.project.pinned ? -1 : 1
    }
    // 2. Revenue score descending
    const scoreDiff = REVENUE_RANK[b.project.revenue_score] - REVENUE_RANK[a.project.revenue_score]
    if (scoreDiff !== 0) return scoreDiff
    // 3. Next step tasks before regular tasks
    if (a.task.is_next_step !== b.task.is_next_step) {
      return a.task.is_next_step ? -1 : 1
    }
    // 4. Low-energy tasks first (easiest to start)
    return ENERGY_RANK[b.task.energy] - ENERGY_RANK[a.task.energy]
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add lib/revenue.ts lib/__tests__/revenue.test.ts
git commit -m "feat: revenue sort utility with tests — home screen money moves ordering"
```

---

### Task 5: Finance Calculation Utilities + Tests

**Files:**
- Create: `lib/finance.ts`
- Create: `lib/__tests__/finance.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// lib/__tests__/finance.test.ts
import { describe, it, expect } from 'vitest'
import { getExpenseSummary, getRevenueTotal } from '../finance'
import type { Expense, RevenueEntry } from '../types'

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e1',
  description: 'Test expense',
  amount: 10,
  category: 'hosting',
  project_id: null,
  paid_by: 'shaan',
  expense_date: '2026-04-01',
  created_by: null,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

const makeRevenue = (overrides: Partial<RevenueEntry> = {}): RevenueEntry => ({
  id: 'r1',
  description: 'Test revenue',
  amount: 100,
  stream: 'course',
  project_id: null,
  revenue_date: '2026-04-01',
  created_by: null,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

describe('getExpenseSummary', () => {
  it('returns correct totals per paid_by', () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 25, paid_by: 'shaan' }),
      makeExpense({ amount: 10, paid_by: 'shaan' }),
      makeExpense({ amount: 50, paid_by: 'deb' }),
      makeExpense({ amount: 20, paid_by: 'split' }),
    ]
    const summary = getExpenseSummary(expenses)
    expect(summary.shaanPaid).toBe(35)
    expect(summary.debPaid).toBe(50)
    expect(summary.splitTotal).toBe(20)
    expect(summary.total).toBe(105)
  })

  it('returns zeros for empty array', () => {
    const summary = getExpenseSummary([])
    expect(summary.shaanPaid).toBe(0)
    expect(summary.debPaid).toBe(0)
    expect(summary.total).toBe(0)
  })

  it('groups expenses by category', () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 10, category: 'hosting' }),
      makeExpense({ amount: 20, category: 'hosting' }),
      makeExpense({ amount: 15, category: 'domains' }),
    ]
    const summary = getExpenseSummary(expenses)
    expect(summary.byCategory.hosting).toBe(30)
    expect(summary.byCategory.domains).toBe(15)
  })
})

describe('getRevenueTotal', () => {
  it('sums revenue entries', () => {
    const entries: RevenueEntry[] = [
      makeRevenue({ amount: 500 }),
      makeRevenue({ amount: 250 }),
    ]
    expect(getRevenueTotal(entries)).toBe(750)
  })

  it('returns 0 for empty array', () => {
    expect(getRevenueTotal([])).toBe(0)
  })

  it('groups by stream', () => {
    const entries: RevenueEntry[] = [
      makeRevenue({ amount: 200, stream: 'course' }),
      makeRevenue({ amount: 100, stream: 'course' }),
      makeRevenue({ amount: 50, stream: 'subscription' }),
    ]
    const byStream = entries.reduce((acc, e) => {
      acc[e.stream] = (acc[e.stream] ?? 0) + e.amount
      return acc
    }, {} as Record<string, number>)
    expect(byStream.course).toBe(300)
    expect(byStream.subscription).toBe(50)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```

Expected: FAIL — "Cannot find module '../finance'"

- [ ] **Step 3: Write the implementation**

```typescript
// lib/finance.ts
import type { Expense, RevenueEntry, ExpenseCategory } from './types'

export interface ExpenseSummary {
  total: number
  shaanPaid: number
  debPaid: number
  splitTotal: number
  byCategory: Partial<Record<ExpenseCategory, number>>
}

export function getExpenseSummary(expenses: Expense[]): ExpenseSummary {
  const summary: ExpenseSummary = {
    total: 0,
    shaanPaid: 0,
    debPaid: 0,
    splitTotal: 0,
    byCategory: {},
  }

  for (const expense of expenses) {
    summary.total += expense.amount
    if (expense.paid_by === 'shaan') summary.shaanPaid += expense.amount
    if (expense.paid_by === 'deb') summary.debPaid += expense.amount
    if (expense.paid_by === 'split') summary.splitTotal += expense.amount
    summary.byCategory[expense.category] =
      (summary.byCategory[expense.category] ?? 0) + expense.amount
  }

  return summary
}

export function getRevenueTotal(entries: RevenueEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0)
}

export function getRevenueByStream(entries: RevenueEntry[]): Partial<Record<string, number>> {
  return entries.reduce((acc, e) => {
    acc[e.stream] = (acc[e.stream] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)
}

/** Returns revenue entries where revenue_date falls within the current calendar month */
export function filterCurrentMonth<T extends { revenue_date?: string; expense_date?: string }>(
  entries: T[],
  dateKey: 'revenue_date' | 'expense_date'
): T[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return entries.filter(e => {
    const d = new Date(e[dateKey] as string)
    return d.getFullYear() === year && d.getMonth() === month
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/finance.ts lib/__tests__/finance.test.ts
git commit -m "feat: finance calculation utilities with tests"
```

---

### Task 6: Navigation Shell Rebuild

**Files:**
- Modify: `components/BottomNav.tsx`
- Modify: `components/Sidebar.tsx`
- Modify: `components/AppShell.tsx`

- [ ] **Step 1: Rewrite BottomNav with new 5-item mobile nav**

```tsx
// components/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/projects', icon: '📂', label: 'Projects' },
  { href: '/finance', icon: '💰', label: 'Finance' },
  { href: '/leads', icon: '🎯', label: 'Leads' },
  { href: '/log', icon: '🏆', label: 'Log' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden">
      {NAV_ITEMS.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              isActive
                ? 'text-teal-700 font-semibold'
                : 'text-gray-500 hover:text-teal-700'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: Rewrite Sidebar with all 8 routes**

```tsx
// components/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/projects', icon: '📂', label: 'Projects' },
  { href: '/finance', icon: '💰', label: 'Finance' },
  { href: '/marketing', icon: '📣', label: 'Marketing' },
  { href: '/leads', icon: '🎯', label: 'Leads' },
  { href: '/log', icon: '🏆', label: 'Log & Wins' },
  { href: '/resources', icon: '🔗', label: 'Resources' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-gray-200 py-6 px-3 shrink-0">
      <div className="px-3 mb-8">
        <div className="text-teal-700 font-bold text-sm">SD VetStudio</div>
        <div className="text-gray-400 text-xs">Mission Control</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-teal-700'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Update AppShell to add padding for new routes**

Read the existing `components/AppShell.tsx` first, then ensure it wraps children with `pb-20 md:pb-0` to account for the bottom nav height, and renders both `<Sidebar />` and `<BottomNav />`.

```tsx
// components/AppShell.tsx
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F5F0E8]">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/AppShell.tsx components/BottomNav.tsx components/Sidebar.tsx
git commit -m "feat: rebuild navigation shell — 5-item mobile nav + 8-route desktop sidebar"
```

---

### Task 7: Page Stubs

**Files:**
- Create: `app/finance/page.tsx`
- Create: `app/marketing/page.tsx`
- Create: `app/leads/page.tsx`
- Modify: `app/page.tsx`
- Modify: `app/projects/page.tsx`
- Modify: `app/log/page.tsx`
- Modify: `app/resources/page.tsx`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Create Finance stub**

```tsx
// app/finance/page.tsx
export default function FinancePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-teal-700 mb-2">💰 Finance</h1>
      <p className="text-gray-500">Expenses and revenue — coming in Phase 3.</p>
    </div>
  )
}
```

- [ ] **Step 2: Create Marketing stub**

```tsx
// app/marketing/page.tsx
export default function MarketingPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-teal-700 mb-2">📣 Marketing</h1>
      <p className="text-gray-500">Content calendar and launch pipeline — coming in Phase 4.</p>
    </div>
  )
}
```

- [ ] **Step 3: Create Leads stub**

```tsx
// app/leads/page.tsx
export default function LeadsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-teal-700 mb-2">🎯 Leads & Pipeline</h1>
      <p className="text-gray-500">Lead and beta tester tracking — coming in Phase 4.</p>
    </div>
  )
}
```

- [ ] **Step 4: Update Home stub**

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-teal-700 mb-2">🏠 Revenue Dashboard</h1>
      <p className="text-gray-500">Your money moves — coming in Phase 2.</p>
    </div>
  )
}
```

- [ ] **Step 5: Update remaining stubs to remove old content**

For `app/projects/page.tsx`, `app/log/page.tsx`, `app/resources/page.tsx`, `app/settings/page.tsx` — read each file first, then replace the main content with a clean stub that matches the new design system (teal headings, cream background). Keep any existing auth wrappers or Supabase client calls in place — only replace the rendered UI.

- [ ] **Step 6: Start the dev server and verify all routes load without errors**

```bash
npm run dev
```

Visit each route: `/`, `/projects`, `/finance`, `/marketing`, `/leads`, `/log`, `/resources`, `/settings`. All should render without console errors.

- [ ] **Step 7: Commit**

```bash
git add app/finance/page.tsx app/marketing/page.tsx app/leads/page.tsx app/page.tsx app/projects/page.tsx app/log/page.tsx app/resources/page.tsx app/settings/page.tsx
git commit -m "feat: add finance/marketing/leads routes, update all pages to new shell"
```

---

### Task 8: PWA Manifest Update

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Update the manifest**

```json
{
  "name": "SD VetStudio Mission Control",
  "short_name": "Mission Control",
  "description": "Revenue-first business dashboard for SD VetStudio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F0E8",
  "theme_color": "#1E6B5E",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add public/manifest.json
git commit -m "chore: update PWA manifest for revenue dashboard"
```

---

### Task 9: Phase 1 Smoke Test

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (revenue sort + finance utils).

- [ ] **Step 2: Run the dev server and walk through every route**

```bash
npm run dev
```

Verify:
- Login page loads and auth works
- After login, AppShell renders with sidebar (desktop) / bottom nav (mobile)
- All 8 routes load without errors or console warnings
- Navigation highlights active route correctly

- [ ] **Step 3: Run a production build to catch TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with 0 TypeScript errors.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: phase 1 smoke test fixes"
```

**Phase 1 complete.** The app has a working schema, typed data layer, tested utilities, and a full navigation shell. Ready for Phase 2: Core Screens.
