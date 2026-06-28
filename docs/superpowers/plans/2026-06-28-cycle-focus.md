# Cycle Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight Basecamp-style "Cycle Focus" layer — 6-week cycles + 1-week cooldown, bet on a few projects, home shows only the bets plus a Parking Lot, and the daily email becomes a per-bet check-in nudge.

**Architecture:** Three additive Supabase tables (`cycles`, `cycle_bets`, `bet_checkins`). Cycle phase is derived from today's date by pure functions (unit-tested). Server components fetch via query helpers; a client `CycleFocus` panel handles status taps via thin API routes. The existing `sendDailyDigest()` gains a cycle section. Nothing existing changes behaviour; with zero cycles the UI shows a "Start a cycle" prompt and the email omits the section.

**Tech Stack:** Next.js 16 App Router, Supabase (`@supabase/ssr`), Tailwind + inline brand styles, Resend, Vitest.

## Global Constraints

- **Dates are AEST.** "Today" = `new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })` → `'YYYY-MM-DD'`. Use this exact expression everywhere "today" is needed (matches the 7am AEST digest).
- **Cycle length:** 6 weeks active + 1 week cooldown. Defaults computed by `defaultCycleDates`.
- **Owner / created_by values are TEXT:** `'shaan' | 'deb' | 'both'` for owner, `'shaan' | 'deb'` for created_by — matches `tasks.assigned_to`. NOT profile UUIDs.
- **Dynamic route signature:** `{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`.
- **API routes:** auth-gate with `const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`. Return the real `error.message` on failure.
- **RLS:** every new table gets `ENABLE ROW LEVEL SECURITY` + a `FOR ALL TO authenticated USING (true) WITH CHECK (true)` policy.
- **Brand tokens:** cream `#F5F0E8`/`#FBF7EF`, teal `#1E6B5E`, dark `#0D2035`/`#1E2A35`, gold `#D4A853`, border `#E8E2D6`, muted `#9AA5AC`/`#6B7A82`. Status colors: on_track teal `#1E6B5E` on `#D4F0EE`; stuck `#92400E` on `#FEF3C7`; done `#6B7A82` on `#EFEAE0`. Rounded-xl/2xl cards.

---

## File Structure

- `supabase/migrations/20260628000000_create_cycles.sql` — 3 tables + indexes + RLS (Task 1)
- `lib/types/database.ts` — add cycle types (Task 2)
- `lib/cycles.ts` — pure date/phase helpers (Task 2)
- `lib/__tests__/cycles.test.ts` — unit tests for the helpers (Task 2)
- `lib/queries/cycles.ts` — `getCurrentCycle`, `getCycleBets`, `getParkingLotProjects` (Task 3)
- `app/api/cycles/route.ts` — POST create cycle (Task 4)
- `app/api/cycles/[id]/route.ts` — PATCH edit/end cycle (Task 4)
- `app/api/cycles/[id]/bets/route.ts` — POST add bet (Task 4)
- `app/api/cycles/[id]/bets/[betId]/route.ts` — DELETE bet (Task 4)
- `app/api/cycles/bets/[betId]/checkin/route.ts` — POST upsert today's check-in (Task 4)
- `components/home/CycleFocus.tsx` — client panel: bets, status taps, parking lot, cooldown banner, start prompt (Task 5)
- `app/page.tsx` — fetch cycle data, render `CycleFocus`, drop `FocusProjects` while active (Task 5)
- `app/cycle/page.tsx` + `app/cycle/CycleManager.tsx` — management view (Task 6)
- `components/Sidebar.tsx` — add Cycle nav item (Task 7)
- `lib/email/daily-digest.ts` — add cycle section to the email (Task 8)

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260628000000_create_cycles.sql`

**Interfaces:**
- Produces: tables `cycles`, `cycle_bets`, `bet_checkins` with the columns referenced by every later task.

- [ ] **Step 1: Write the migration**

```sql
-- ── Cycles ───────────────────────────────────────────────────────────────────
-- A "cycle" is a 6-week focus period + 1-week cooldown (Basecamp/Shape Up style).
-- Phase (active/cooldown/done) is DERIVED from dates in app code, not stored.

CREATE TABLE IF NOT EXISTS cycles (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT        NOT NULL,
  starts_on        DATE        NOT NULL,
  ends_on          DATE        NOT NULL,
  cooldown_ends_on DATE        NOT NULL,
  created_by       TEXT        CHECK (created_by IN ('shaan', 'deb')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on >= starts_on),
  CHECK (cooldown_ends_on >= ends_on)
);

CREATE INDEX IF NOT EXISTS cycles_starts_on_idx ON cycles(starts_on DESC);

-- ── Cycle bets ───────────────────────────────────────────────────────────────
-- A "bet" = a project you commit to this cycle, with one goal line + an owner.

CREATE TABLE IF NOT EXISTS cycle_bets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id    UUID        NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  goal_line   TEXT        NOT NULL,
  owner       TEXT        NOT NULL DEFAULT 'both' CHECK (owner IN ('shaan', 'deb', 'both')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cycle_id, project_id)
);

CREATE INDEX IF NOT EXISTS cycle_bets_cycle_id_idx ON cycle_bets(cycle_id);

-- ── Bet check-ins ────────────────────────────────────────────────────────────
-- One row per (bet, day). The check-in API upserts on (bet_id, checkin_date).

CREATE TABLE IF NOT EXISTS bet_checkins (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  bet_id       UUID        NOT NULL REFERENCES cycle_bets(id) ON DELETE CASCADE,
  checkin_date DATE        NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('on_track', 'stuck', 'done')),
  note         TEXT,
  created_by   TEXT        CHECK (created_by IN ('shaan', 'deb')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (bet_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS bet_checkins_bet_id_idx ON bet_checkins(bet_id, checkin_date DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE cycles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_bets   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage cycles"
  ON cycles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage cycle_bets"
  ON cycle_bets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage bet_checkins"
  ON bet_checkins FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Apply the migration to Supabase**

Apply via the Supabase MCP `apply_migration` tool (name `create_cycles`, the SQL above) OR paste into the Supabase SQL editor and run. This project applies migrations to the remote DB directly.

- [ ] **Step 3: Verify the tables exist**

Use the Supabase MCP `list_tables` tool (or `select * from cycles limit 1` in the SQL editor). Expected: `cycles`, `cycle_bets`, `bet_checkins` present with the columns above and RLS enabled.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260628000000_create_cycles.sql
git commit -m "feat: cycles, cycle_bets, bet_checkins tables + RLS"
```

---

## Task 2: Types + pure cycle helpers (TDD)

**Files:**
- Modify: `lib/types/database.ts` (append the cycle types)
- Create: `lib/cycles.ts`
- Test: `lib/__tests__/cycles.test.ts`

**Interfaces:**
- Consumes: `Project` type from `lib/types/database.ts`.
- Produces:
  - Types: `CyclePhase`, `CheckinStatus`, `BetOwner`, `Cycle`, `CycleBet`, `BetCheckin`, `CycleWithPhase`, `BetWithDetails`.
  - Functions in `lib/cycles.ts`:
    - `addWeeks(dateStr: string, weeks: number): string`
    - `defaultCycleDates(startsOn: string): { ends_on: string; cooldown_ends_on: string }`
    - `derivePhase(cycle: Pick<Cycle,'starts_on'|'ends_on'|'cooldown_ends_on'>, today: string): CyclePhase`
    - `daysBetween(fromStr: string, toStr: string): number`
    - `weekOf(cycle: Pick<Cycle,'starts_on'>, today: string): number`
    - `totalWeeks(cycle: Pick<Cycle,'starts_on'|'ends_on'>): number`
    - `daysLeft(cycle: Pick<Cycle,'ends_on'>, today: string): number`

- [ ] **Step 1: Add the cycle types to `lib/types/database.ts`**

Append at the end of the file:

```ts
// ── Cycle Focus ───────────────────────────────────────────────────────────────

export type CyclePhase = 'upcoming' | 'active' | 'cooldown' | 'done'
export type CheckinStatus = 'on_track' | 'stuck' | 'done'
export type BetOwner = 'shaan' | 'deb' | 'both'

export interface Cycle {
  id: string
  name: string
  starts_on: string          // 'YYYY-MM-DD'
  ends_on: string            // 'YYYY-MM-DD'
  cooldown_ends_on: string   // 'YYYY-MM-DD'
  created_by: 'shaan' | 'deb' | null
  created_at: string
}

export interface CycleBet {
  id: string
  cycle_id: string
  project_id: string
  goal_line: string
  owner: BetOwner
  sort_order: number
  created_at: string
}

export interface BetCheckin {
  id: string
  bet_id: string
  checkin_date: string       // 'YYYY-MM-DD'
  status: CheckinStatus
  note: string | null
  created_by: 'shaan' | 'deb' | null
  created_at: string
}

export interface CycleWithPhase extends Cycle {
  phase: CyclePhase
  weekOf: number             // 1..totalWeeks during active, 0 before start
  totalWeeks: number
  daysLeft: number           // whole days until ends_on, min 0
}

export interface BetWithDetails extends CycleBet {
  project: Pick<Project, 'id' | 'name' | 'emoji' | 'stage'> | null
  latest_checkin: BetCheckin | null
}
```

- [ ] **Step 2: Write the failing tests**

Create `lib/__tests__/cycles.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  addWeeks,
  defaultCycleDates,
  derivePhase,
  daysBetween,
  weekOf,
  totalWeeks,
  daysLeft,
} from '../cycles'

const cycle = { starts_on: '2026-07-06', ends_on: '2026-08-17', cooldown_ends_on: '2026-08-24' }

describe('addWeeks', () => {
  it('adds whole weeks without timezone drift', () => {
    expect(addWeeks('2026-07-06', 6)).toBe('2026-08-17')
    expect(addWeeks('2026-08-17', 1)).toBe('2026-08-24')
  })
})

describe('defaultCycleDates', () => {
  it('computes ends_on = +6w and cooldown_ends_on = +7w', () => {
    expect(defaultCycleDates('2026-07-06')).toEqual({
      ends_on: '2026-08-17',
      cooldown_ends_on: '2026-08-24',
    })
  })
})

describe('derivePhase', () => {
  it('is upcoming the day before start', () => {
    expect(derivePhase(cycle, '2026-07-05')).toBe('upcoming')
  })
  it('is active on the start day and the last active day', () => {
    expect(derivePhase(cycle, '2026-07-06')).toBe('active')
    expect(derivePhase(cycle, '2026-08-17')).toBe('active')
  })
  it('is cooldown after ends_on through cooldown_ends_on', () => {
    expect(derivePhase(cycle, '2026-08-18')).toBe('cooldown')
    expect(derivePhase(cycle, '2026-08-24')).toBe('cooldown')
  })
  it('is done after cooldown_ends_on', () => {
    expect(derivePhase(cycle, '2026-08-25')).toBe('done')
  })
})

describe('daysBetween / weekOf / totalWeeks / daysLeft', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-07-06', '2026-07-13')).toBe(7)
  })
  it('weekOf is 1 on the start day, 2 after 7 days', () => {
    expect(weekOf(cycle, '2026-07-06')).toBe(1)
    expect(weekOf(cycle, '2026-07-12')).toBe(1)
    expect(weekOf(cycle, '2026-07-13')).toBe(2)
  })
  it('totalWeeks is 6 for a default cycle', () => {
    expect(totalWeeks(cycle)).toBe(6)
  })
  it('daysLeft is days until ends_on, floored at 0', () => {
    expect(daysLeft(cycle, '2026-08-15')).toBe(2)
    expect(daysLeft(cycle, '2026-08-20')).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- cycles`
Expected: FAIL — `Cannot find module '../cycles'`.

- [ ] **Step 4: Implement `lib/cycles.ts`**

```ts
// lib/cycles.ts
// Pure date/phase helpers for Cycle Focus — no DB, no I/O, fully testable.
// All dates are 'YYYY-MM-DD' strings interpreted at UTC midnight to avoid
// timezone drift; callers pass an AEST "today" string in.

import type { Cycle, CyclePhase } from '@/lib/types/database'

const MS_PER_DAY = 86_400_000

function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addWeeks(dateStr: string, weeks: number): string {
  const d = parseDate(dateStr)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return toDateString(d)
}

export function defaultCycleDates(startsOn: string): { ends_on: string; cooldown_ends_on: string } {
  const ends_on = addWeeks(startsOn, 6)
  return { ends_on, cooldown_ends_on: addWeeks(ends_on, 1) }
}

export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((parseDate(toStr).getTime() - parseDate(fromStr).getTime()) / MS_PER_DAY)
}

export function derivePhase(
  cycle: Pick<Cycle, 'starts_on' | 'ends_on' | 'cooldown_ends_on'>,
  today: string,
): CyclePhase {
  const t = parseDate(today).getTime()
  if (t < parseDate(cycle.starts_on).getTime()) return 'upcoming'
  if (t <= parseDate(cycle.ends_on).getTime()) return 'active'
  if (t <= parseDate(cycle.cooldown_ends_on).getTime()) return 'cooldown'
  return 'done'
}

export function weekOf(cycle: Pick<Cycle, 'starts_on'>, today: string): number {
  const elapsed = daysBetween(cycle.starts_on, today)
  if (elapsed < 0) return 0
  return Math.floor(elapsed / 7) + 1
}

export function totalWeeks(cycle: Pick<Cycle, 'starts_on' | 'ends_on'>): number {
  return Math.round(daysBetween(cycle.starts_on, cycle.ends_on) / 7)
}

export function daysLeft(cycle: Pick<Cycle, 'ends_on'>, today: string): number {
  return Math.max(0, daysBetween(today, cycle.ends_on))
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- cycles`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add lib/types/database.ts lib/cycles.ts lib/__tests__/cycles.test.ts
git commit -m "feat: cycle types + pure phase/date helpers with tests"
```

---

## Task 3: Query helpers

**Files:**
- Create: `lib/queries/cycles.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; helpers from `@/lib/cycles`; types from `@/lib/types/database`.
- Produces:
  - `getCurrentCycle(): Promise<CycleWithPhase | null>`
  - `getCycleBets(cycleId: string): Promise<BetWithDetails[]>`
  - `getParkingLotProjects(cycleId: string): Promise<Pick<Project,'id'|'name'|'emoji'|'stage'>[]>`
  - `aestToday(): string` (exported; reused by API routes + email)

- [ ] **Step 1: Implement the query helpers**

```ts
// lib/queries/cycles.ts
import { createClient } from '@/lib/supabase/server'
import { derivePhase, weekOf, totalWeeks, daysLeft } from '@/lib/cycles'
import type {
  Cycle, CycleWithPhase, BetWithDetails, BetCheckin, Project,
} from '@/lib/types/database'

/** Today in AEST as 'YYYY-MM-DD' — matches the 7am AEST digest. */
export function aestToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

/** The cycle whose [starts_on, cooldown_ends_on] contains today; else the latest. */
export async function getCurrentCycle(): Promise<CycleWithPhase | null> {
  const supabase = await createClient()
  const today = aestToday()

  const { data: current } = await supabase
    .from('cycles')
    .select('*')
    .lte('starts_on', today)
    .gte('cooldown_ends_on', today)
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle()

  let cycle = current as Cycle | null
  if (!cycle) {
    const { data: latest } = await supabase
      .from('cycles')
      .select('*')
      .order('starts_on', { ascending: false })
      .limit(1)
      .maybeSingle()
    cycle = latest as Cycle | null
  }
  if (!cycle) return null

  return {
    ...cycle,
    phase: derivePhase(cycle, today),
    weekOf: weekOf(cycle, today),
    totalWeeks: totalWeeks(cycle),
    daysLeft: daysLeft(cycle, today),
  }
}

/** Bets for a cycle, joined to their project + most-recent check-in. */
export async function getCycleBets(cycleId: string): Promise<BetWithDetails[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cycle_bets')
    .select('*, project:projects(id, name, emoji, stage)')
    .eq('cycle_id', cycleId)
    .order('sort_order', { ascending: true })

  const bets = (data ?? []) as unknown as BetWithDetails[]
  const betIds = bets.map((b) => b.id)
  if (betIds.length === 0) return bets

  const { data: checkins } = await supabase
    .from('bet_checkins')
    .select('*')
    .in('bet_id', betIds)
    .order('checkin_date', { ascending: false })

  const latestByBet: Record<string, BetCheckin> = {}
  for (const c of (checkins ?? []) as BetCheckin[]) {
    if (!latestByBet[c.bet_id]) latestByBet[c.bet_id] = c
  }
  return bets.map((b) => ({ ...b, latest_checkin: latestByBet[b.id] ?? null }))
}

/** Active-stage projects NOT bet on this cycle — the Parking Lot. */
export async function getParkingLotProjects(
  cycleId: string,
): Promise<Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>[]> {
  const supabase = await createClient()
  const { data: bets } = await supabase
    .from('cycle_bets')
    .select('project_id')
    .eq('cycle_id', cycleId)
  const betIds = new Set((bets ?? []).map((b: { project_id: string }) => b.project_id))

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, emoji, stage')
    .in('stage', ['live', 'beta', 'building'])
    .order('updated_at', { ascending: false })

  return ((projects ?? []) as Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>[])
    .filter((p) => !betIds.has(p.id))
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `lib/queries/cycles.ts`. (If `Project` lacks the picked fields, fix the import — they already exist on `Project`.)

- [ ] **Step 3: Commit**

```bash
git add lib/queries/cycles.ts
git commit -m "feat: cycle query helpers (current cycle, bets, parking lot)"
```

---

## Task 4: API routes

**Files:**
- Create: `app/api/cycles/route.ts`
- Create: `app/api/cycles/[id]/route.ts`
- Create: `app/api/cycles/[id]/bets/route.ts`
- Create: `app/api/cycles/[id]/bets/[betId]/route.ts`
- Create: `app/api/cycles/bets/[betId]/checkin/route.ts`

**Interfaces:**
- Consumes: `createClient`, `defaultCycleDates` from `@/lib/cycles`, `aestToday` from `@/lib/queries/cycles`.
- Produces: HTTP endpoints used by Tasks 5 & 6:
  - `POST /api/cycles` body `{ starts_on?, ends_on?, cooldown_ends_on?, created_by? }` → the new cycle row
  - `PATCH /api/cycles/[id]` body any of `{ name, starts_on, ends_on, cooldown_ends_on }`
  - `POST /api/cycles/[id]/bets` body `{ project_id, goal_line, owner }` → the new bet row
  - `DELETE /api/cycles/[id]/bets/[betId]`
  - `POST /api/cycles/bets/[betId]/checkin` body `{ status, note?, created_by? }` → upserted check-in

- [ ] **Step 1: Create `app/api/cycles/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { defaultCycleDates } from '@/lib/cycles'
import { aestToday } from '@/lib/queries/cycles'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const starts_on: string = body.starts_on ?? aestToday()
  const defaults = defaultCycleDates(starts_on)
  const ends_on: string = body.ends_on ?? defaults.ends_on
  const cooldown_ends_on: string = body.cooldown_ends_on ?? defaults.cooldown_ends_on

  // Reject a cycle that overlaps an existing one's full [start, cooldown] span.
  const { data: overlap } = await supabase
    .from('cycles')
    .select('id')
    .lte('starts_on', cooldown_ends_on)
    .gte('cooldown_ends_on', starts_on)
    .limit(1)
    .maybeSingle()
  if (overlap) return NextResponse.json({ error: 'A cycle already covers that date range' }, { status: 409 })

  const { count } = await supabase.from('cycles').select('id', { count: 'exact', head: true })
  const name = `Cycle ${(count ?? 0) + 1}`

  const { data, error } = await supabase
    .from('cycles')
    .insert({ name, starts_on, ends_on, cooldown_ends_on, created_by: body.created_by ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Create `app/api/cycles/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  for (const k of ['name', 'starts_on', 'ends_on', 'cooldown_ends_on'] as const) {
    if (body[k] !== undefined) patch[k] = body[k]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }
  const { data, error } = await supabase.from('cycles').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Create `app/api/cycles/[id]/bets/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: cycle_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.project_id || !body.goal_line?.trim()) {
    return NextResponse.json({ error: 'project_id and goal_line are required' }, { status: 400 })
  }
  const owner = ['shaan', 'deb', 'both'].includes(body.owner) ? body.owner : 'both'

  const { data, error } = await supabase
    .from('cycle_bets')
    .insert({
      cycle_id,
      project_id: body.project_id,
      goal_line: body.goal_line.trim(),
      owner,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Create `app/api/cycles/[id]/bets/[betId]/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; betId: string }> }) {
  const { betId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('cycle_bets').delete().eq('id', betId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Create `app/api/cycles/bets/[betId]/checkin/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aestToday } from '@/lib/queries/cycles'

export async function POST(req: Request, { params }: { params: Promise<{ betId: string }> }) {
  const { betId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!['on_track', 'stuck', 'done'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be on_track | stuck | done' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bet_checkins')
    .upsert(
      {
        bet_id: betId,
        checkin_date: aestToday(),
        status: body.status,
        note: body.note?.trim() || null,
        created_by: body.created_by ?? null,
      },
      { onConflict: 'bet_id,checkin_date' },
    )
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 6: Build to verify the routes compile**

Run: `npm run build`
Expected: build succeeds; the route table lists `/api/cycles`, `/api/cycles/[id]`, `/api/cycles/[id]/bets`, `/api/cycles/[id]/bets/[betId]`, `/api/cycles/bets/[betId]/checkin`.

- [ ] **Step 7: Commit**

```bash
git add app/api/cycles
git commit -m "feat: cycle API routes (create/edit cycle, add/remove bet, check-in)"
```

---

## Task 5: Home Cycle Focus panel

**Files:**
- Create: `components/home/CycleFocus.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `getCurrentCycle`, `getCycleBets`, `getParkingLotProjects` (Task 3); `CycleWithPhase`, `BetWithDetails`, `Project` types; the check-in API (Task 4).
- Produces: `<CycleFocus cycle bets parkingLot />` rendered on home.

- [ ] **Step 1: Create `components/home/CycleFocus.tsx`**

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CycleWithPhase, BetWithDetails, CheckinStatus, Project } from '@/lib/types/database'

const STATUS_STYLE: Record<CheckinStatus, { label: string; bg: string; color: string }> = {
  on_track: { label: 'On track', bg: '#D4F0EE', color: '#1E6B5E' },
  stuck:    { label: 'Stuck',    bg: '#FEF3C7', color: '#92400E' },
  done:     { label: 'Done',     bg: '#EFEAE0', color: '#6B7A82' },
}
const STATUS_ORDER: CheckinStatus[] = ['on_track', 'stuck', 'done']

function fmt(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold uppercase tracking-[1.6px]" style={{ color: '#6B7A82' }}>
      {children}
    </div>
  )
}

function BetCard({ bet }: { bet: BetWithDetails }) {
  const router = useRouter()
  const [status, setStatus] = useState<CheckinStatus | null>(bet.latest_checkin?.status ?? null)
  const [note, setNote] = useState(bet.latest_checkin?.note ?? '')
  const [saving, setSaving] = useState(false)

  async function checkIn(next: CheckinStatus, noteValue: string) {
    setSaving(true)
    setStatus(next)
    await fetch(`/api/cycles/bets/${bet.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, note: noteValue }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl p-3.5" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="text-xl leading-none">{bet.project?.emoji ?? '📁'}</span>
        <Link
          href={bet.project ? `/projects/${bet.project.id}` : '#'}
          className="flex-1 text-[14px] font-bold truncate hover:underline"
          style={{ color: '#0D2035' }}
        >
          {bet.project?.name ?? 'Project'}
        </Link>
        <span className="text-[11px] font-semibold shrink-0" style={{ color: '#9AA5AC' }}>
          {bet.owner === 'both' ? '👥' : bet.owner === 'shaan' ? 'S' : 'D'}
        </span>
      </div>

      <div className="text-[12.5px] mb-2.5" style={{ color: '#6B7A82' }}>
        🎯 {bet.goal_line}
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        {STATUS_ORDER.map((s) => {
          const st = STATUS_STYLE[s]
          const active = status === s
          return (
            <button
              key={s}
              type="button"
              disabled={saving}
              onClick={() => checkIn(s, note)}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: active ? st.bg : '#F5F0E8',
                color: active ? st.color : '#9AA5AC',
                border: active ? `1px solid ${st.color}33` : '1px solid transparent',
              }}
            >
              {st.label}
            </button>
          )
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => status && checkIn(status, note)}
        placeholder="One-line update…"
        className="w-full text-[12.5px] px-2.5 py-1.5 rounded-lg outline-none"
        style={{ background: '#FBF7EF', border: '1px solid #EFEAE0', color: '#1E2A35' }}
      />
    </div>
  )
}

export default function CycleFocus({
  cycle,
  bets,
  parkingLot,
}: {
  cycle: CycleWithPhase | null
  bets: BetWithDetails[]
  parkingLot: Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>[]
}) {
  const [showParking, setShowParking] = useState(false)

  // No cycle, or finished → prompt to start one.
  if (!cycle || cycle.phase === 'done' || cycle.phase === 'upcoming') {
    return (
      <div className="mb-5">
        <Link
          href="/cycle"
          className="block rounded-2xl p-4 text-center text-[13.5px] font-semibold transition-shadow hover:shadow-sm"
          style={{ background: '#fff', border: '1px dashed #CDC3AE', color: '#1E6B5E' }}
        >
          Start a cycle → focus on a few projects for the next 6 weeks
        </Link>
      </div>
    )
  }

  // Cooldown → calm banner.
  if (cycle.phase === 'cooldown') {
    return (
      <div className="mb-5">
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: '#E8F4F0', border: '1px solid #CDE6DF' }}
        >
          <div>
            <div className="text-[14px] font-bold" style={{ color: '#1E6B5E' }}>
              Cooldown · rest + small stuff 🛋️
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: '#6B7A82' }}>
              {cycle.name} wrapped. Next cycle starts when you bet again.
            </div>
          </div>
          <Link
            href="/cycle"
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shrink-0"
            style={{ background: '#1E6B5E' }}
          >
            Plan next →
          </Link>
        </div>
      </div>
    )
  }

  // Active.
  const pct = Math.min(100, Math.round(((cycle.totalWeeks * 7 - cycle.daysLeft) / (cycle.totalWeeks * 7)) * 100))
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>
          {cycle.name} · Week {cycle.weekOf} of {cycle.totalWeeks} · {cycle.daysLeft} days left
        </SectionLabel>
        <Link href="/cycle" className="text-[11.5px] font-semibold" style={{ color: '#1E6B5E' }}>
          Manage →
        </Link>
      </div>

      <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: '#EFEAE0' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#1E6B5E' }} />
      </div>

      {bets.length === 0 ? (
        <Link
          href="/cycle"
          className="block rounded-xl p-4 text-center text-[13px]"
          style={{ background: '#fff', border: '1px dashed #CDC3AE', color: '#9AA5AC' }}
        >
          No bets yet — pick the projects you’re focusing on →
        </Link>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}

      {parkingLot.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowParking((v) => !v)}
            className="text-[11.5px] font-semibold"
            style={{ color: '#9AA5AC' }}
          >
            🅿️ Parking Lot · {parkingLot.length} projects · not this cycle {showParking ? '▲' : '▼'}
          </button>
          {showParking && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parkingLot.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="px-2.5 py-1 rounded-full text-[11.5px]"
                  style={{ background: '#F5F0E8', color: '#6B7A82', border: '1px solid #EFEAE0' }}
                >
                  {p.emoji} {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire into `app/page.tsx`**

Add imports near the other home imports:

```tsx
import CycleFocus from '@/components/home/CycleFocus'
import { getCurrentCycle, getCycleBets, getParkingLotProjects } from '@/lib/queries/cycles'
```

Replace the existing `Promise.all([...])` data fetch block with one that also loads the cycle, then derive bets/parking lot:

```tsx
  const [nextTasks, pinnedProjects, revenueEntries, settingsRow, currentCycle] = await Promise.all([
    getNextStepTasks(),
    getPinnedProjects(),
    getRevenueEntries(),
    supabase.from('settings').select('value').eq('key', 'home_scratchpad').single(),
    getCurrentCycle(),
  ])

  const cycleActive = !!currentCycle && (currentCycle.phase === 'active' || currentCycle.phase === 'cooldown')
  const bets = currentCycle && currentCycle.phase === 'active' ? await getCycleBets(currentCycle.id) : []
  const parkingLot = currentCycle && currentCycle.phase === 'active' ? await getParkingLotProjects(currentCycle.id) : []
```

Render `CycleFocus` right after the Greeting strip's closing `</div>` and before `<CommandBox />`:

```tsx
        <CycleFocus cycle={currentCycle} bets={bets} parkingLot={parkingLot} />
```

Replace the bottom 2-col grid so the pinned card only shows when no cycle is active:

```tsx
        {cycleActive ? (
          <YourNext3 tasks={nextTasks} profiles={allProfiles} />
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
            <YourNext3 tasks={nextTasks} profiles={allProfiles} />
            <FocusProjects projects={pinnedProjects} />
          </div>
        )}
```

- [ ] **Step 3: Build + lint**

Run: `npm run build`
Expected: compiles; `/` still renders. Then run the react-best-practices review skill on the new component (per repo tooling): `Skill(react-best-practices)` against `components/home/CycleFocus.tsx` and fix anything it flags (keys, effect deps, etc.).

- [ ] **Step 4: Manual preview check**

Start the dev server (`preview_start`), open `/`. With no cycle yet you should see the "Start a cycle" prompt and the pinned Focus projects card still present. Take a `preview_screenshot`.

- [ ] **Step 5: Commit**

```bash
git add components/home/CycleFocus.tsx app/page.tsx
git commit -m "feat: home Cycle Focus panel (bets, check-in taps, parking lot)"
```

---

## Task 6: `/cycle` management page

**Files:**
- Create: `app/cycle/page.tsx`
- Create: `app/cycle/CycleManager.tsx`

**Interfaces:**
- Consumes: `getCurrentCycle`, `getCycleBets`, `getParkingLotProjects`; the cycle + bet APIs (Task 4); `getProjects` from `@/lib/queries/projects` for the project picker.
- Produces: a sidebar-linked page to start a cycle, add/remove bets, and see check-in history.

- [ ] **Step 1: Create the server page `app/cycle/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import CycleManager from './CycleManager'
import { getCurrentCycle, getCycleBets } from '@/lib/queries/cycles'
import { getProjects } from '@/lib/queries/projects'

export default async function CyclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const currentCycle = await getCurrentCycle()
  const isActive = !!currentCycle && (currentCycle.phase === 'active' || currentCycle.phase === 'cooldown')
  const bets = currentCycle && isActive ? await getCycleBets(currentCycle.id) : []
  const projects = await getProjects()
  const betProjectIds = new Set(bets.map((b) => b.project_id))
  const eligibleProjects = projects
    .filter((p) => ['live', 'beta', 'building', 'exploring'].includes(p.stage))
    .filter((p) => !betProjectIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, stage: p.stage }))

  return (
    <>
      <TopBar crumbs={['Cycle']} />
      <div className="pb-24 md:pb-7" style={{ padding: '24px 28px' }}>
        <CycleManager
          cycle={currentCycle && isActive ? currentCycle : null}
          bets={bets}
          eligibleProjects={eligibleProjects}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Create the client component `app/cycle/CycleManager.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CycleWithPhase, BetWithDetails, BetOwner, Project } from '@/lib/types/database'

type EligibleProject = Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>

export default function CycleManager({
  cycle,
  bets,
  eligibleProjects,
}: {
  cycle: CycleWithPhase | null
  bets: BetWithDetails[]
  eligibleProjects: EligibleProject[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [goal, setGoal] = useState('')
  const [owner, setOwner] = useState<BetOwner>('both')

  async function startCycle() {
    setBusy(true)
    await fetch('/api/cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setBusy(false)
    router.refresh()
  }

  async function addBet() {
    if (!projectId || !goal.trim() || !cycle) return
    setBusy(true)
    await fetch(`/api/cycles/${cycle.id}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, goal_line: goal, owner }),
    })
    setProjectId('')
    setGoal('')
    setBusy(false)
    router.refresh()
  }

  async function removeBet(betId: string) {
    if (!cycle) return
    setBusy(true)
    await fetch(`/api/cycles/${cycle.id}/bets/${betId}`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  if (!cycle) {
    return (
      <div className="max-w-xl">
        <h1 className="text-[22px] font-bold mb-2" style={{ color: '#0D2035', fontFamily: 'Georgia, serif' }}>
          No cycle running
        </h1>
        <p className="text-[13.5px] mb-4" style={{ color: '#6B7A82' }}>
          Start a 6-week cycle, then bet on the few projects you’ll focus on. Everything else waits in the Parking Lot.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={startCycle}
          className="px-4 py-2 rounded-lg text-white text-[13.5px] font-semibold disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          Start a cycle →
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-[22px] font-bold mb-1" style={{ color: '#0D2035', fontFamily: 'Georgia, serif' }}>
        {cycle.name}
      </h1>
      <p className="text-[13px] mb-5" style={{ color: '#6B7A82' }}>
        {cycle.phase === 'active'
          ? `Week ${cycle.weekOf} of ${cycle.totalWeeks} · ${cycle.daysLeft} days left`
          : 'Cooldown'}{' '}
        · {cycle.starts_on} → {cycle.ends_on}
      </p>

      {/* Bets */}
      <div className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: '#6B7A82' }}>
        Your bets · {bets.length}
      </div>
      <div className="flex flex-col gap-2 mb-5">
        {bets.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: '#fff', border: '1px solid #E8E2D6' }}
          >
            <span className="text-lg">{b.project?.emoji ?? '📁'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold truncate" style={{ color: '#0D2035' }}>
                {b.project?.name ?? 'Project'}
              </div>
              <div className="text-[12px] truncate" style={{ color: '#6B7A82' }}>🎯 {b.goal_line}</div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => removeBet(b.id)}
              className="text-[12px] font-semibold disabled:opacity-50"
              style={{ color: '#9AA5AC' }}
            >
              Remove
            </button>
          </div>
        ))}
        {bets.length === 0 && (
          <div className="text-[13px] italic" style={{ color: '#9AA5AC' }}>No bets yet — add one below.</div>
        )}
      </div>

      {/* Add bet */}
      <div className="rounded-xl p-3.5" style={{ background: '#FBF7EF', border: '1px solid #EFEAE0' }}>
        <div className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: '#6B7A82' }}>
          Add a bet
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full text-[13px] px-2.5 py-2 rounded-lg mb-2 outline-none"
          style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#1E2A35' }}
        >
          <option value="">Pick a project…</option>
          {eligibleProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name} ({p.stage})</option>
          ))}
        </select>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What does done look like?"
          className="w-full text-[13px] px-2.5 py-2 rounded-lg mb-2 outline-none"
          style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#1E2A35' }}
        />
        <div className="flex items-center gap-2 mb-2">
          {(['shaan', 'deb', 'both'] as BetOwner[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOwner(o)}
              className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
              style={{
                background: owner === o ? '#D4F0EE' : '#fff',
                color: owner === o ? '#1E6B5E' : '#9AA5AC',
                border: '1px solid #E8E2D6',
              }}
            >
              {o === 'both' ? '👥 Both' : o === 'shaan' ? 'Shaan' : 'Deb'}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy || !projectId || !goal.trim()}
          onClick={addBet}
          className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          Add bet
        </button>
      </div>

      {/* Check-in history */}
      {bets.some((b) => b.latest_checkin) && (
        <div className="mt-6">
          <div className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: '#6B7A82' }}>
            Latest check-ins
          </div>
          <div className="flex flex-col gap-1.5">
            {bets.filter((b) => b.latest_checkin).map((b) => (
              <div key={b.id} className="text-[12.5px]" style={{ color: '#6B7A82' }}>
                <span style={{ color: '#0D2035', fontWeight: 600 }}>{b.project?.name}</span>
                {' · '}{b.latest_checkin!.status.replace('_', ' ')}
                {b.latest_checkin!.note ? ` · “${b.latest_checkin!.note}”` : ''}
                {' · '}{b.latest_checkin!.checkin_date}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build + preview**

Run: `npm run build`. Then preview `/cycle`: start a cycle, add a bet, confirm it appears; go to `/` and confirm the bet shows in the Cycle Focus panel and tapping a status persists (reload — it stays). Screenshot both.

- [ ] **Step 4: Commit**

```bash
git add app/cycle
git commit -m "feat: /cycle management page (start cycle, add/remove bets, history)"
```

---

## Task 7: Sidebar nav item

**Files:**
- Modify: `components/Sidebar.tsx:6-16` (the `NAV_ITEMS` array)

**Interfaces:**
- Consumes: nothing new.
- Produces: a `/cycle` link in the sidebar.

- [ ] **Step 1: Add the Cycle nav item**

Insert a `Cycle` entry right after Home in `NAV_ITEMS`, using the free `⌘0` shortcut (the others keep their shortcuts):

```tsx
const NAV_ITEMS = [
  { href: '/',           label: 'Home',       shortcut: '⌘1' },
  { href: '/cycle',      label: 'Cycle',      shortcut: '⌘0' },
  { href: '/projects',   label: 'Projects',   shortcut: '⌘2' },
  { href: '/finance',    label: 'Finance',    shortcut: '⌘3' },
  { href: '/crm',        label: 'CRM',        shortcut: '⌘4' },
  { href: '/log',        label: 'Log & Wins', shortcut: '⌘5' },
  { href: '/meetings',   label: 'Meetings',   shortcut: '⌘6' },
  { href: '/marketing',  label: 'Marketing',  shortcut: '⌘7' },
  { href: '/resources',  label: 'Resources',  shortcut: '⌘8' },
  { href: '/settings',   label: 'Settings',   shortcut: '⌘9' },
]
```

(Note: this only adds the visual link + label. The `⌘0` text is decorative — wiring an actual keyboard shortcut is out of scope; the existing shortcuts are also display-only unless already bound elsewhere. Do NOT add new keybinding logic.)

- [ ] **Step 2: Build + preview**

Run: `npm run build`. Preview: the sidebar shows "Cycle" linking to `/cycle`, active-highlight works when on the page.

- [ ] **Step 3: Commit**

```bash
git add components/Sidebar.tsx
git commit -m "feat: add Cycle to sidebar nav"
```

---

## Task 8: Daily email cycle section

**Files:**
- Modify: `lib/email/daily-digest.ts`

**Interfaces:**
- Consumes: `getCurrentCycle`-style logic, but the digest uses its own `supabase` client (service/server) — so query the tables directly here rather than importing the server-component helper. Reuses `derivePhase`, `weekOf`, `totalWeeks`, `daysLeft` from `@/lib/cycles`.
- Produces: a "This cycle" section injected into the digest HTML, per recipient.

- [ ] **Step 1: Add cycle imports + a section builder to `lib/email/daily-digest.ts`**

At the top, add:

```ts
import { derivePhase, weekOf, totalWeeks, daysLeft } from '@/lib/cycles'
```

Add these interfaces near the other `interface ...Row` declarations:

```ts
interface CycleEmailBet { project: string; goal: string; status: string | null; note: string | null }
interface CycleEmailData {
  name: string
  phase: 'active' | 'cooldown'
  weekOf: number
  totalWeeks: number
  daysLeft: number
  cooldownEndsOn: string
  bets: CycleEmailBet[]
}
```

Add a section-builder function (above `buildEmailHtml`):

```ts
const STATUS_LABEL: Record<string, { text: string; bg: string; color: string }> = {
  on_track: { text: 'On track', bg: '#D4F0EE', color: '#1E6B5E' },
  stuck:    { text: 'Stuck',    bg: '#FEF3C7', color: '#92400E' },
  done:     { text: 'Done',     bg: '#EFEAE0', color: '#6B7A82' },
}

function buildCycleSection(cycle: CycleEmailData | null, appUrl: string): string {
  if (!cycle) return ''
  if (cycle.phase === 'cooldown') {
    return `
    <div style="padding:20px 28px 0;">
      <div style="background:#E8F4F0;border-radius:10px;padding:14px 16px;">
        <div style="font-size:14px;font-weight:700;color:#1E6B5E;">Cooldown · rest + small stuff 🛋️</div>
        <div style="font-size:12.5px;color:#6B7A82;margin-top:2px;">${cycle.name} wrapped — next cycle starts when you bet again.</div>
      </div>
    </div>`
  }
  const betRows = cycle.bets.length === 0
    ? '<p style="color:#9AA5AC;font-size:13px;margin:4px 0 0;">No bets set yet — pick your focus projects.</p>'
    : cycle.bets.map((b) => {
        const s = b.status ? STATUS_LABEL[b.status] : null
        const pill = s
          ? `<span style="font-size:11px;background:${s.bg};color:${s.color};padding:1px 8px;border-radius:10px;">${s.text}</span>`
          : `<span style="font-size:11px;background:#F5F0E8;color:#9AA5AC;padding:1px 8px;border-radius:10px;">No check-in yet</span>`
        return `
          <div style="padding:10px 0;border-bottom:1px solid #F5F0E8;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="font-size:13.5px;font-weight:600;color:#1E2A35;">${b.project}</div>
              ${pill}
            </div>
            <div style="font-size:12px;color:#9AA5AC;margin-top:2px;">🎯 ${b.goal}${b.note ? ` · “${b.note}”` : ''}</div>
          </div>`
      }).join('')

  return `
    <div style="padding:20px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:4px;">
        This cycle · Week ${cycle.weekOf} of ${cycle.totalWeeks} · ${cycle.daysLeft} days left
      </div>
      ${betRows}
      <a href="${appUrl}/cycle" style="display:inline-block;margin-top:10px;font-size:12.5px;font-weight:600;color:#1E6B5E;text-decoration:none;">
        Update today’s check-in →
      </a>
    </div>`
}
```

- [ ] **Step 2: Thread the section into `buildEmailHtml`**

Change the signature and insert the section directly under the header block (before "Your next money moves"):

```ts
function buildEmailHtml(
  name: string,
  tasks: TaskRow[],
  projects: ProjectRow[],
  wins: WinRow[],
  cycle: CycleEmailData | null,   // NEW
): string {
```

Then, immediately after the closing `</div>` of the teal header block and before the `Your next money moves` block, insert:

```ts
    ${buildCycleSection(cycle, appUrl)}
```

(`appUrl` is already defined at the top of `buildEmailHtml`.)

- [ ] **Step 3: Fetch cycle data in `sendDailyDigest` and pass it per recipient**

After the existing shared-data `Promise.all` (revenue/wins/projects), add a cycle fetch:

```ts
  // Current cycle (shared across recipients; bets filtered per-recipient below)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
  const { data: cycleRow } = await supabase
    .from('cycles')
    .select('*')
    .lte('starts_on', today)
    .gte('cooldown_ends_on', today)
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle()

  let cycleBetsRaw: any[] = []
  let cyclePhase: 'active' | 'cooldown' | null = null
  if (cycleRow) {
    const phase = derivePhase(cycleRow, today)
    if (phase === 'active' || phase === 'cooldown') cyclePhase = phase
    if (phase === 'active') {
      const { data: betsData } = await supabase
        .from('cycle_bets')
        .select('id, owner, goal_line, project:projects(name)')
        .eq('cycle_id', cycleRow.id)
        .order('sort_order', { ascending: true })
      cycleBetsRaw = betsData ?? []

      // latest check-in per bet
      const betIds = cycleBetsRaw.map((b) => b.id)
      if (betIds.length) {
        const { data: checkins } = await supabase
          .from('bet_checkins')
          .select('bet_id, status, note, checkin_date')
          .in('bet_id', betIds)
          .order('checkin_date', { ascending: false })
        const latest: Record<string, any> = {}
        for (const c of checkins ?? []) if (!latest[c.bet_id]) latest[c.bet_id] = c
        cycleBetsRaw = cycleBetsRaw.map((b) => ({ ...b, checkin: latest[b.id] ?? null }))
      }
    }
  }
```

Inside the `for (const recipient of recipients)` loop, build that recipient's cycle data before the `resend.emails.send` call:

```ts
    const recipientCycle: CycleEmailData | null = cyclePhase && cycleRow
      ? {
          name: cycleRow.name,
          phase: cyclePhase,
          weekOf: weekOf(cycleRow, today),
          totalWeeks: totalWeeks(cycleRow),
          daysLeft: daysLeft(cycleRow, today),
          cooldownEndsOn: cycleRow.cooldown_ends_on,
          bets:
            cyclePhase === 'active'
              ? cycleBetsRaw
                  .filter((b) => b.owner === recipient.assignedTo || b.owner === 'both')
                  .map((b) => ({
                    project: b.project?.name ?? 'Project',
                    goal: b.goal_line,
                    status: b.checkin?.status ?? null,
                    note: b.checkin?.note ?? null,
                  }))
              : [],
        }
      : null
```

And pass it into the HTML call:

```ts
        html: buildEmailHtml(recipient.name, tasks, projectRows, allWins as WinRow[], recipientCycle),
```

- [ ] **Step 4: Build + send a test digest**

Run: `npm run build`. Then trigger the existing "Send digest now" button in `/settings` (or `POST /api/email/daily-digest/test`) and eyeball the email — with an active cycle + bets it shows the "This cycle" block with status pills and the "Update today's check-in →" link; with no cycle the email is unchanged.

- [ ] **Step 5: Commit**

```bash
git add lib/email/daily-digest.ts
git commit -m "feat: daily email gains a cycle check-in section"
```

---

## Final verification

- [ ] `npm test` — all suites pass (existing 49 + new cycle tests).
- [ ] `npm run build` — clean production build.
- [ ] End-to-end preview: start a cycle → add 2 bets → tap statuses + notes on home → reload (persists) → send test digest (section renders). Screenshot the home panel.
- [ ] Merge `feat/cycle-focus` → `master` and push (Vercel auto-deploys). Safe even pre-first-cycle: home shows "Start a cycle", email omits the section.

## Self-review notes (author)

- **Spec coverage:** 3 tables (Task 1) ✓; phases derived (Task 2) ✓; home panel + parking lot + cooldown + start prompt + replaces FocusProjects (Task 5) ✓; `/cycle` page (Task 6) ✓; sidebar (Task 7) ✓; email per-owner section (Task 8) ✓; safe rollout (Final) ✓.
- **No new DB writes from email** — read-only, correct.
- **AEST "today"** is consistent across query helper, API routes, and email (Global Constraints).
