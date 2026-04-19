# Mission Control — Home Page + Task Priority Redesign

## Overview

The home page drifted from the original spec during the revenue dashboard rebuild. `YourNext3` and `FocusProjects` components exist and are fully built but are not connected to `app/page.tsx`. The task "next step" toggle exists in `TaskList` but is a 16px hover-only square — invisible on mobile.

This spec fixes both problems with minimal code changes. No new dependencies. No DB migrations.

## Problems Solved

1. **Home page answers the wrong question** — currently shows revenue tiles and an unprioritised task list. Should answer: *"What should I do right now?"*
2. **Priority toggle is invisible on mobile** — the `is_next_step` toggle is hover-only and 16px. On a phone, hover doesn't exist. The 🔥 button must be always-visible and immediately tappable.

## Scope

| File | Change |
|------|--------|
| `app/page.tsx` | Replace revenue widgets with YourNext3 + FocusProjects |
| `components/project-detail/TaskList.tsx` | 🔥 button always visible; energy tag on add form |
| `components/home/YourNext3.tsx` | Verify and fix data wiring if needed |
| `components/home/FocusProjects.tsx` | Verify and fix data wiring if needed |

**Out of scope:** Finance page, Log page, Resources, Leads, DB schema, navigation, Vercel integration.

---

## Screen 1 — Home Page (`app/page.tsx`)

### Layout (top to bottom)

1. **Header** — "SD VetStudio" in teal + current date below in gray
2. **Your Next 3** — `<YourNext3 userId={user.id} />` (already built)
3. **Focus Projects** — `<FocusProjects />` (already built)
4. **Quick Actions** — three tiles: `+ Add Idea → /projects`, `All Projects → /projects`, `Resources → /resources`

### What gets removed from home

- `<RevenueTiles />` → lives at `/finance`
- `<MoneyMovesList />` → replaced by YourNext3 (which shows properly curated personal tasks)
- `<WinStreak />` → lives at `/log`

### Data fetching

`app/page.tsx` becomes a thin server component that:
1. Gets the authenticated user
2. Passes `userId` to `YourNext3` (so it knows whose tasks to show)
3. `FocusProjects` fetches its own pinned projects (already does this)
4. No revenue queries on the home page

---

## Screen 2 — Task Priority UX (`components/project-detail/TaskList.tsx`)

### The 🔥 button

**Current behaviour:** 16px amber square, appears on CSS hover only, invisible on mobile.

**New behaviour:**
- Always-visible 🔥 button to the left of every active task title
- Inactive state: gray/muted `🔥` (24px tap target minimum)
- Active state (task IS the next step): full gold/amber 🔥, task floats to top of list, gold left border on the row, `NEXT` badge in gold pill on the right
- One task per project can be 🔥 at a time — tapping 🔥 on a new task clears the previous one (handled in the PATCH endpoint: set `is_next_step = false` on all tasks for that project, then `true` on the tapped one)

### Energy tag on add form

Current add form: text input + Add button only.

New add form: text input + energy pill selector + Add button.

Energy pills: `⚡ High` | `☕ Med` | `🛋️ Low` — defaults to Med. Sent with the POST to `/api/tasks`. The existing `energy` column on `tasks` table already supports this.

### Task ordering

Active tasks sorted: 🔥 next step first, then by `sort_order`, then by `created_at`. Completed tasks remain collapsed under `<details>`.

### Completion checkbox

The completion checkbox (currently missing from `TaskList.tsx` — tasks show but can't be ticked from the task list itself, only via "Money Moves" on home) gets added as a proper checkbox on the left of each row. On tick: PATCH `completed: true`, log to `activity_log`.

---

## API changes

### `PATCH /api/tasks/[id]`

Needs to handle a new case: when `is_next_step: true` is sent, first clear `is_next_step` on all sibling tasks (same `project_id`), then set it on the target. This ensures only one task is ever the next step per project.

```ts
// Pseudocode for the clear-then-set pattern
if (body.is_next_step === true) {
  await supabase
    .from('tasks')
    .update({ is_next_step: false })
    .eq('project_id', task.project_id)
  
  await supabase
    .from('tasks')
    .update({ is_next_step: true })
    .eq('id', id)
}
```

### `POST /api/tasks`

Add `energy` field to the insert (already in schema, just needs to be passed through from the form).

---

## Design tokens

No new tokens. Existing values from `tailwind.config`:
- Gold/amber for 🔥 active: `amber-400` / `amber-100` text `amber-700`
- Teal primary: `teal-700`
- Card background: `white`
- Page background: existing cream/gray-50

---

## Non-goals

- No kanban board
- No drag-to-reorder (sort_order stays manual for now)
- No Vercel/GitHub integration (separate effort)
- No domain tracking
- No Slack integration
- No PWA changes
