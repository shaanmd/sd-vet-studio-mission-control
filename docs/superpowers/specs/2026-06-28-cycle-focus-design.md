# Cycle Focus — Design Spec

**Date:** 2026-06-28
**Status:** Approved (design), pending implementation plan
**Branch:** `feat/cycle-focus`

## Problem

SD VetStudio runs too many open projects at once. Everything feels "active," nothing
feels like it's progressing, and it's exhausting to decide what to ignore. Shaan + Deb
(both AuDHD) want **permission to focus on a few things for a fixed stretch** and a
guilt-free rhythm — the problem Basecamp's Shape Up "cycles" were invented to solve.

## Solution (one line)

A lightweight **Cycle Focus** layer on top of the existing projects/tasks model: every
6 weeks you *bet* on a handful of projects, the home page shows only those bets (plus a
calm "Parking Lot" of everything else), and the existing daily email becomes a check-in
nudge. Then a 1-week cooldown, then bet again.

Deliberately **excluded** (would recreate the overwhelm): betting-table ceremony, hill
charts, pitches/shaping docs, message board, circuit breaker. None of these are built.

## Goals

- Home page only ever surfaces what's "on the table" this cycle.
- A real finish line (countdown) + a guilt-free cooldown = built-in dopamine and rest.
- A 10-second daily check-in per bet, nudged by the existing 7am email.
- Additive: no existing table or feature changes behaviour.

## Non-goals

- No automatic project→bet assignment; betting is a manual, deliberate act.
- No hill charts / progress sliders in v1 (possible later add).
- No multi-cycle planning ahead; you bet on the *next* cycle when the current one ends.

## Rhythm & phases

Cycle length is **6 weeks active + 1 week cooldown** (fixed for v1).

Phase is **derived from today's date**, never manually toggled:

| Phase      | Condition                                          |
|------------|----------------------------------------------------|
| `active`   | `starts_on <= today <= ends_on`                    |
| `cooldown` | `ends_on < today <= cooldown_ends_on`              |
| `done`     | `today > cooldown_ends_on`                         |
| `upcoming` | `today < starts_on`                                |

The "current cycle" = the cycle whose `[starts_on, cooldown_ends_on]` range contains
today; if none, the most recent cycle by `starts_on`. At most one cycle is current.

## Data model

Three new tables. All additive; nothing existing is modified. Follows existing Supabase
+ RLS-for-authenticated-users conventions.

### `cycles`
| column              | type        | notes                                        |
|---------------------|-------------|----------------------------------------------|
| `id`                | uuid PK     | `gen_random_uuid()`                          |
| `name`              | text        | auto "Cycle 1", "Cycle 2"… (max existing +1) |
| `starts_on`         | date        | required                                     |
| `ends_on`           | date        | required; defaults to `starts_on + 6 weeks`  |
| `cooldown_ends_on`  | date        | required; defaults to `ends_on + 1 week`     |
| `created_by`        | text        | 'shaan'/'deb'                                |
| `created_at`        | timestamptz | default `now()`                              |

Constraint: `ends_on >= starts_on`, `cooldown_ends_on >= ends_on`.

### `cycle_bets`
| column        | type        | notes                                          |
|---------------|-------------|------------------------------------------------|
| `id`          | uuid PK     |                                                |
| `cycle_id`    | uuid FK     | → `cycles(id)` ON DELETE CASCADE               |
| `project_id`  | uuid FK     | → `projects(id)` ON DELETE CASCADE             |
| `goal_line`   | text        | "what done looks like" — short, required       |
| `owner`       | text        | CHECK in ('shaan','deb','both')                |
| `sort_order`  | int         | default 0                                      |
| `created_at`  | timestamptz | default `now()`                                |

Constraint: `UNIQUE (cycle_id, project_id)` — a project is bet on at most once per cycle.

### `bet_checkins`
| column         | type        | notes                                          |
|----------------|-------------|------------------------------------------------|
| `id`           | uuid PK     |                                                |
| `bet_id`       | uuid FK     | → `cycle_bets(id)` ON DELETE CASCADE           |
| `checkin_date` | date        | the day the check-in is for                    |
| `status`       | text        | CHECK in ('on_track','stuck','done')           |
| `note`         | text        | nullable, one-line                             |
| `created_by`   | text        | 'shaan'/'deb'                                  |
| `created_at`   | timestamptz | default `now()`                                |

Constraint: `UNIQUE (bet_id, checkin_date)` — one check-in per bet per day; the
check-in API **upserts** on this key so re-checking-in overwrites today's row.

"Current status" of a bet = its check-in for today, else its most recent check-in.

## UI

### Home page — Cycle Focus panel (new hero section, under the greeting)

Component `components/home/CycleFocus.tsx` (client for the status taps), fed by a
server query in `app/page.tsx`.

- **active:** header `Cycle 2 · Week 3 of 6 · 18 days left` + thin progress bar
  (elapsed/total of the 6 weeks). Then **bet cards**, one per bet:
  - project emoji + name (links to `/projects/[id]`), the `goal_line`, owner avatar.
  - today's **status control**: three pills `On track / Stuck / Done` (current one
    highlighted) + an optional one-line note input. Tapping a pill or saving a note
    upserts today's check-in.
  - This panel **replaces the pinned "Focus projects" card** (`FocusProjects`) on the
    home page while a cycle is active.
- **Parking Lot** (collapsible, calm/greyed, collapsed by default): every active-stage
  project (`live`/`beta`/`building`) NOT bet on this cycle. Header e.g. "Parking Lot ·
  7 projects · not this cycle." Permission-to-ignore.
- **cooldown:** panel collapses to a soft banner — "Cooldown · rest + small stuff ·
  next cycle starts <date>". Bets hidden.
- **no current cycle (done/none):** a single "Start a cycle →" prompt linking to `/cycle`.

`YourNext3` ("next money moves") and the rest of the home page are unchanged.

### `/cycle` page (management view)

`app/cycle/page.tsx` (+ a client component for editing). Added to the sidebar nav.

- **Current cycle header** with phase + dates; "End cycle early" and date-edit affordances.
- **Bets editor:** add a bet = pick a project (from active-stage projects not already
  bet) + write `goal_line` + choose owner; remove a bet; reorder.
- **Start a cycle** (when none current): name auto-fills, `starts_on` defaults to today,
  `ends_on`/`cooldown_ends_on` auto-compute (editable), then add bets.
- **Check-in history:** per bet, the recent check-ins (date · status · note) — a small
  sense of the arc.

## Daily email (extends existing digest)

Modify `lib/email/daily-digest.ts` `buildEmailHtml()` to insert a **"This cycle"**
section near the top (under the header, above "Your next money moves"). Reuses existing
brand styling (cream/teal, the same card shell).

- **active:** `This cycle · Week 3 of 6 · 18 days left`, then each bet **owned by this
  recipient** (or 'both'): project name + `goal_line` + yesterday's status pill + note,
  and a button **"Update today's check-in →"** deep-linking to the app (`NEXT_PUBLIC_APP_URL`).
- **cooldown:** a calm "Cooldown — rest up, next cycle starts <date>" line; no bet rows.
- **no current cycle:** section omitted entirely (email looks like today's).

`sendDailyDigest()` gains the cycle data fetch (current cycle + this recipient's bets +
latest check-in per bet) alongside its existing revenue/wins/projects fetch. Per-recipient
bet filtering mirrors the existing per-recipient task logic (owner in `[recipient.assignedTo, 'both']`).

## API routes

Follow existing `app/api/**/route.ts` conventions (auth via `supabase.auth.getUser()`,
JSON in/out, return the real error message).

- `POST /api/cycles` — create a cycle. Body: `{ starts_on?, ends_on?, cooldown_ends_on? }`;
  server auto-fills name + default dates. Rejects if a cycle is already current.
- `PATCH /api/cycles/[id]` — edit dates / end early (sets `cooldown_ends_on` to bring
  the cycle to `done`).
- `POST /api/cycles/[id]/bets` — add a bet `{ project_id, goal_line, owner }`.
- `DELETE /api/cycles/[id]/bets/[betId]` — remove a bet.
- `POST /api/cycles/bets/[betId]/checkin` — upsert today's check-in `{ status, note }`
  on `(bet_id, today)`.

## Queries / lib

- `lib/queries/cycles.ts`:
  - `getCurrentCycle()` → cycle + derived `phase` + week/day math.
  - `getCycleBets(cycleId)` → bets joined to project (emoji/name/stage) + latest check-in.
  - `getParkingLotProjects(cycleId)` → active-stage projects not bet on this cycle.
- `lib/cycles.ts` (pure, unit-tested): `derivePhase(cycle, today)`, `weekOf(cycle, today)`,
  `daysLeft(cycle, today)`, `defaultCycleDates(startsOn)`. Pure functions, no DB — mirrors
  the `lib/ai.ts` pure-helpers + `lib/__tests__` pattern.

## Brand tokens

Cream `#F5F0E8`/`#FBF7EF`, teal `#1E6B5E`, dark `#1E2A35`, gold `#D4A853`, borders
`#E8E2D6`, muted `#9AA5AC`. Status pills: on_track = teal, stuck = amber `#92400E` on
`#FEF3C7`, done = muted/checked. Rounded-2xl cards, Georgia serif headings.

## Testing

- Pure functions in `lib/cycles.ts` covered by `lib/__tests__/cycles.test.ts`
  (phase boundaries: day before start, start day, last active day, first cooldown day,
  last cooldown day, after; week math; default date arithmetic across a DST-free date math).
- Manual verification via preview: start a cycle, add bets, tap statuses, confirm home
  panel + parking lot + cooldown banner render; send a test digest and eyeball the
  cycle section.

## Rollout

- Additive migration; no backfill needed (no cycles exist yet).
- Ship behind no flag — with zero cycles, home shows the "Start a cycle" prompt and the
  email omits the section, so production is safe before the first cycle is created.

## Open questions

None outstanding. Two decisions confirmed with the user: bets are shown **per-owner** in
each person's email; the Cycle panel **replaces** the pinned "Focus projects" card on
home while a cycle is active.
