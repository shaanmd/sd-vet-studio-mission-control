# Home Page + Task Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewire the home page to show "Your Next 3" + "Focus Projects" instead of revenue widgets, and make the 🔥 next-step toggle always visible on tasks with a completion checkbox and energy selector.

**Architecture:** Three isolated changes — (1) home page data fetching + layout swap, (2) PATCH API route fix for exclusive next-step assignment, (3) TaskList UI overhaul. Each can be built and committed independently.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS, Supabase JS client, Vitest + jsdom

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `app/page.tsx` | Replace revenue widgets with YourNext3 + FocusProjects |
| Modify | `app/api/tasks/[id]/route.ts` | Clear-then-set logic for `is_next_step` |
| Modify | `components/project-detail/TaskList.tsx` | 🔥 always visible, checkbox right side, energy on add form |
| Create | `lib/__tests__/tasks-api.test.ts` | Unit test for clear-then-set logic |

---

## Task 1: Rewire the home page

**Files:**
- Modify: `app/page.tsx`

The home page currently fetches revenue data and renders `RevenueTiles`, `MoneyMovesList`, and `WinStreak`. These belong on `/finance` and `/log`. We swap them for `YourNext3` and `FocusProjects`, which are already built and just need to be wired up with their data.

`YourNext3` needs `debTasks`, `shaanTasks`, and `profiles`. We get these by fetching all profiles, finding Deb and Shaan by name, then calling `getPersonalTasks` for each.

`FocusProjects` needs `projects: ProjectWithDetails[]`. `getPinnedProjects()` already returns exactly this shape.

- [ ] **Step 1: Start the dev server and note the current home page**

```bash
cd C:/Users/summe/Projects/sd-vet-studio-mission-control
npm run dev
```

Open `http://localhost:3000`. Take a mental note of what you see (revenue tiles, money moves list). We'll verify the change worked at the end.

- [ ] **Step 2: Replace `app/page.tsx` entirely**

```tsx
// app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getPinnedProjects } from '@/lib/queries/projects'
import { getPersonalTasks } from '@/lib/queries/personal-tasks'
import YourNext3 from '@/components/home/YourNext3'
import FocusProjects from '@/components/home/FocusProjects'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all profiles to find Deb and Shaan's IDs
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_url, slack_user_id, created_at')

  const allProfiles = profiles ?? []
  const debProfile = allProfiles.find((p) => p.name === 'Deb')
  const shaanProfile = allProfiles.find((p) => p.name === 'Shaan')

  // Fetch personal tasks and pinned projects in parallel
  const [debTasks, shaanTasks, pinnedProjects] = await Promise.all([
    debProfile ? getPersonalTasks(debProfile.id) : Promise.resolve([]),
    shaanProfile ? getPersonalTasks(shaanProfile.id) : Promise.resolve([]),
    getPinnedProjects(),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1E6B5E' }}>SD VetStudio</h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <YourNext3
        debTasks={debTasks}
        shaanTasks={shaanTasks}
        profiles={allProfiles}
      />

      <FocusProjects projects={pinnedProjects} />

      <div>
        <h2
          className="text-[11px] uppercase tracking-[2px] font-semibold mb-3"
          style={{ color: '#D4A853' }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <a
            href="/projects"
            className="bg-white rounded-xl p-3 text-center text-sm font-medium border border-black/8"
            style={{ color: '#1E6B5E' }}
          >
            + Add Idea
          </a>
          <a
            href="/projects"
            className="bg-white rounded-xl p-3 text-center text-sm font-medium text-gray-600 border border-black/8"
          >
            All Projects
          </a>
          <a
            href="/resources"
            className="bg-white rounded-xl p-3 text-center text-sm font-medium text-gray-600 border border-black/8"
          >
            Resources
          </a>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Reload `http://localhost:3000`. Expected:
- Revenue tiles are gone
- "Your Next 3" section appears with Deb/Shaan toggle pills
- "Focus Projects" section shows pinned projects (or empty state if none pinned)
- Quick actions show "Add Idea", "All Projects", "Resources"
- No console errors

If you see a TypeScript error about profiles type, the `profiles` select returns rows that match the `Profile` type — add `as Profile[]` after `profiles ?? []` if needed (import `Profile` from `@/lib/types/database`).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: rewire home page to show Your Next 3 and Focus Projects"
```

---

## Task 2: Fix the PATCH route for exclusive next-step assignment

**Files:**
- Modify: `app/api/tasks/[id]/route.ts`
- Create: `lib/__tests__/tasks-api.test.ts`

The current PATCH route does a blind `update(body)` — if you set `is_next_step: true` on one task, no other task gets cleared. This means multiple tasks per project can have `is_next_step = true`, which breaks the "one 🔥 per project" rule.

Fix: when `is_next_step: true` is in the body, first read the task to get its `project_id`, then clear all tasks in that project, then set the target.

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/tasks-api.test.ts`:

```ts
// lib/__tests__/tasks-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the clear-then-set logic in isolation.
// The function takes a supabase client, task id, project_id, and the update body.
import { applyTaskPatch } from '@/lib/mutations/tasks'

const mockUpdate = vi.fn().mockReturnThis()
const mockEq = vi.fn().mockReturnThis()
const mockSelect = vi.fn().mockReturnThis()
const mockSingle = vi.fn()

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    eq: mockEq,
    single: mockSingle,
  })),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('applyTaskPatch', () => {
  it('clears is_next_step on sibling tasks before setting it on the target', async () => {
    mockSingle.mockResolvedValueOnce({ data: { project_id: 'proj-1' }, error: null })
    mockEq.mockReturnThis()
    mockUpdate.mockReturnThis()

    const calls: string[] = []
    mockSupabase.from.mockImplementation((table: string) => {
      calls.push(table)
      return {
        select: () => ({ eq: () => ({ single: mockSingle }) }),
        update: (body: Record<string, unknown>) => ({
          eq: (col: string, val: string) => {
            calls.push(`update:${JSON.stringify(body)}:${col}=${val}`)
            return Promise.resolve({ error: null })
          },
        }),
      }
    })

    await applyTaskPatch(mockSupabase as never, 'task-123', { is_next_step: true })

    // Should have cleared siblings first, then set on target
    expect(calls).toContain('update:{"is_next_step":false}:project_id=proj-1')
    expect(calls).toContain('update:{"is_next_step":true}:id=task-123')
    // Clear must happen before set
    const clearIdx = calls.findIndex((c) => c.includes('"is_next_step":false'))
    const setIdx = calls.findIndex((c) => c.includes('"is_next_step":true'))
    expect(clearIdx).toBeLessThan(setIdx)
  })

  it('passes through other fields without the clear-then-set logic', async () => {
    const updateCalls: string[] = []
    mockSupabase.from.mockImplementation(() => ({
      update: (body: Record<string, unknown>) => ({
        eq: (col: string, val: string) => {
          updateCalls.push(`${JSON.stringify(body)}:${col}=${val}`)
          return Promise.resolve({ error: null })
        },
      }),
    }))

    await applyTaskPatch(mockSupabase as never, 'task-123', { title: 'New title' })

    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toBe('{"title":"New title"}:id=task-123')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run lib/__tests__/tasks-api.test.ts
```

Expected: FAIL — `applyTaskPatch` is not defined yet.

- [ ] **Step 3: Create the `applyTaskPatch` mutation helper**

Create `lib/mutations/tasks.ts`:

```ts
// lib/mutations/tasks.ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function applyTaskPatch(
  supabase: SupabaseClient,
  taskId: string,
  body: Record<string, unknown>
): Promise<{ error: string | null }> {
  // Special case: setting is_next_step = true requires clearing siblings first
  if (body.is_next_step === true) {
    // Get the task's project_id
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', taskId)
      .single()

    if (fetchError) return { error: fetchError.message }

    // Clear all tasks in the project
    const { error: clearError } = await supabase
      .from('tasks')
      .update({ is_next_step: false })
      .eq('project_id', task.project_id)

    if (clearError) return { error: clearError.message }

    // Set the target task
    const { error: setError } = await supabase
      .from('tasks')
      .update({ is_next_step: true })
      .eq('id', taskId)

    return { error: setError?.message ?? null }
  }

  // All other patches: blind update
  const { error } = await supabase
    .from('tasks')
    .update(body)
    .eq('id', taskId)

  return { error: error?.message ?? null }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run lib/__tests__/tasks-api.test.ts
```

Expected: PASS — both tests green.

- [ ] **Step 5: Update the PATCH route to use `applyTaskPatch`**

Replace `app/api/tasks/[id]/route.ts`:

```ts
// app/api/tasks/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { applyTaskPatch } from '@/lib/mutations/tasks'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { error } = await applyTaskPatch(supabase, id, body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/mutations/tasks.ts lib/__tests__/tasks-api.test.ts app/api/tasks/[id]/route.ts
git commit -m "feat: exclusive next-step assignment via clear-then-set in PATCH route"
```

---

## Task 3: Overhaul TaskList — 🔥 button, checkbox, energy selector

**Files:**
- Modify: `components/project-detail/TaskList.tsx`

Three changes in one component:
1. **🔥 button** — move from hover-only amber square to always-visible button on the left, active state shows full gold 🔥 with gold left border on the row
2. **Completion checkbox** — circle button on the far right of each row; on tap sends `PATCH { completed: true, completed_at: now }`
3. **Energy selector on add form** — three pill buttons `⚡ High` / `☕ Med` / `🛋️ Low` below the text input, defaults to `medium`
4. **Sort order** — `is_next_step` tasks always float to the top of the active list

- [ ] **Step 1: Replace `components/project-detail/TaskList.tsx` entirely**

```tsx
// components/project-detail/TaskList.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@/lib/types/database'

type Energy = 'high' | 'medium' | 'low'

const ENERGY_OPTIONS: { value: Energy; label: string; emoji: string }[] = [
  { value: 'high', label: 'High', emoji: '⚡' },
  { value: 'medium', label: 'Med', emoji: '☕' },
  { value: 'low', label: 'Low', emoji: '🛋️' },
]

interface Props {
  projectId: string
  tasks: Task[]
}

export default function TaskList({ projectId, tasks }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newEnergy, setNewEnergy] = useState<Energy>('medium')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const activeTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (a.is_next_step && !b.is_next_step) return -1
      if (!a.is_next_step && b.is_next_step) return 1
      return a.sort_order - b.sort_order
    })
  const completedTasks = tasks.filter((t) => t.completed)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        project_id: projectId,
        energy: newEnergy,
      }),
    })
    setNewTitle('')
    setNewEnergy('medium')
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  async function handleComplete(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: true,
        completed_at: new Date().toISOString(),
      }),
    })
    router.refresh()
  }

  async function handleEdit(id: string) {
    if (!editTitle.trim()) return
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() }),
    })
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleToggleNextStep(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_next_step: !task.is_next_step }),
    })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Tasks ({activeTasks.length})</h3>
        <button
          onClick={() => setAdding(true)}
          className="text-sm font-medium"
          style={{ color: '#1E6B5E' }}
        >
          + Add
        </button>
      </div>

      {activeTasks.length === 0 && !adding && (
        <p className="text-gray-400 text-sm mb-2">No tasks yet.</p>
      )}

      {activeTasks.map((task) => (
        <div
          key={task.id}
          className={`flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 ${
            task.is_next_step ? 'border-l-2 pl-2 -ml-2' : ''
          }`}
          style={task.is_next_step ? { borderLeftColor: '#D4A853' } : {}}
        >
          {/* 🔥 next-step toggle — always visible */}
          <button
            onClick={() => handleToggleNextStep(task)}
            title={task.is_next_step ? 'Remove next step' : 'Mark as next step'}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={task.is_next_step ? { backgroundColor: '#D4A85320' } : {}}
          >
            <span
              className="text-base leading-none"
              style={{ filter: task.is_next_step ? 'none' : 'grayscale(1) opacity(0.35)' }}
            >
              🔥
            </span>
          </button>

          {/* Task content */}
          {editingId === task.id ? (
            <div className="flex gap-2 flex-1">
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit(task.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
              />
              <button onClick={() => handleEdit(task.id)} className="text-sm font-medium" style={{ color: '#1E6B5E' }}>Save</button>
              <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">✕</button>
            </div>
          ) : (
            <>
              <span
                className="text-sm flex-1 truncate"
                style={{ color: task.is_next_step ? '#2C3E50' : '#4B5563', fontWeight: task.is_next_step ? 500 : 400 }}
                onDoubleClick={() => { setEditingId(task.id); setEditTitle(task.title) }}
              >
                {task.title}
              </span>

              {/* NEXT badge */}
              {task.is_next_step && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: '#D4A85320', color: '#b45309' }}
                >
                  NEXT
                </span>
              )}

              {/* Energy badge */}
              {task.energy && (
                <span className="text-xs text-gray-400 shrink-0">
                  {task.energy === 'high' ? '⚡' : task.energy === 'medium' ? '☕' : '🛋️'}
                </span>
              )}

              {/* Delete (double-tap title to edit, swipe/long-press not available in web — show on hover) */}
              <button
                onClick={() => handleDelete(task.id)}
                className="text-xs text-gray-300 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                title="Delete task"
              >
                ✕
              </button>

              {/* Completion checkbox — right side */}
              <button
                onClick={() => handleComplete(task.id)}
                className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors hover:border-teal-600 hover:bg-teal-50"
                style={{ borderColor: '#CBD5E1' }}
                title="Mark complete"
                aria-label={`Complete "${task.title}"`}
              >
                <span className="sr-only">Complete</span>
              </button>
            </>
          )}
        </div>
      ))}

      {/* Add task form */}
      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Energy</span>
            <div className="flex gap-1">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewEnergy(opt.value)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    newEnergy === opt.value
                      ? { backgroundColor: '#1E6B5E', color: 'white' }
                      : { backgroundColor: '#F3F4F6', color: '#6B7280' }
                  }
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAdding(false); setNewTitle(''); setNewEnergy('medium') }}
              className="px-3 py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newTitle.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#1E6B5E' }}
            >
              {saving ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer select-none">
            ✓ {completedTasks.length} completed
          </summary>
          <div className="mt-2 space-y-0">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1.5 opacity-40">
                <span className="w-7 shrink-0" />
                <span className="text-sm text-gray-500 line-through flex-1">{task.title}</span>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#1E6B5E20' }}
                >
                  <span className="text-[10px]" style={{ color: '#1E6B5E' }}>✓</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add `group` class to the task row wrapper**

The delete button uses `group-hover:opacity-100` but the parent div needs `group`. Replace the outer `<div>` on each task row (the one with `flex items-center gap-2 py-2 border-b`) with this (add `group` to the className):

```tsx
<div
  key={task.id}
  className={`group flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 ${
    task.is_next_step ? 'border-l-2 pl-2 -ml-2' : ''
  }`}
  style={task.is_next_step ? { borderLeftColor: '#D4A853' } : {}}
>
```

Note: The full replacement in Step 1 already includes this — this step just calls out the `group` class explicitly so you don't miss it during a partial edit.

- [ ] **Step 3: Verify in browser on a project detail page**

Open `http://localhost:3000/projects` and tap any project. Expected on the task list:
- Every task shows a small 🔥 on the left (gray/faded when inactive)
- Tapping 🔥 makes it gold, adds gold left border to the row, floats it to the top, shows NEXT badge
- Tapping 🔥 again clears it and removes the gold styling
- Only one task can be 🔥 at a time (tapping a second one clears the first)
- Tapping `+ Add` shows the form with energy pills
- Energy pill selection highlights in teal
- Submitting the form creates the task with energy set
- Circle checkbox on far right marks a task complete and moves it to the completed section
- No TypeScript errors in the terminal

- [ ] **Step 4: Commit**

```bash
git add components/project-detail/TaskList.tsx
git commit -m "feat: always-visible fire button, completion checkbox, energy selector on task list"
```

---

## Task 4: Final integration check

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (including the new `tasks-api.test.ts`).

- [ ] **Step 2: Check TypeScript across the project**

```bash
npx tsc --noEmit
```

Expected: No errors. If you see errors about the `Profile` type in `app/page.tsx`, add the import:

```tsx
import type { Profile } from '@/lib/types/database'
// and cast:
const allProfiles = (profiles ?? []) as Profile[]
```

- [ ] **Step 3: Manual end-to-end flow**

1. Home page shows "Your Next 3" + "Focus Projects" — not revenue tiles
2. Your Next 3: toggle between Deb/Shaan tabs, tasks show with energy badges
3. Go to a project → task list shows 🔥 on every task
4. Tap 🔥 on Task A → turns gold, floats to top, shows NEXT badge
5. Tap 🔥 on Task B → B becomes gold, A reverts to gray (exclusive)
6. Go back to home → Focus Projects card shows the 🔥 task as "Next:"
7. Add a task with ⚡ High energy → task appears with ⚡ badge
8. Tick the completion checkbox → task moves to completed, shows ✓

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "fix: type cleanup and integration polish"
```
