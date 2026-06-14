# AI Quick Capture — Command Box Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a home-page free-text box that turns natural language into structured actions (create task(s), generate a project summary) using Claude tool-use, with preview-then-confirm and undo-after-apply.

**Architecture:** Pure helpers in `lib/ai.ts` (tool defs, parse, validate) drive three thin API routes — `command` (interpret → resolved proposed actions), `command/apply` (write + return undo receipt), `command/undo` (reverse). A client component `CommandBox` renders the input, preview cards, confirm, and the persistent Undo line.

**Tech Stack:** Next.js 16 App Router, `@anthropic-ai/sdk` (model `claude-sonnet-4-6`), Supabase server client, Vitest.

---

## File Structure

- `lib/ai.ts` — **modify**: add command types, tool defs, prompts, and pure helpers (`parseToolUses`, `validateAction`, `buildSummaryPrompt`, `SUMMARY_SYSTEM`, `COMMAND_SYSTEM`, `COMMAND_TOOLS`).
- `lib/__tests__/ai.test.ts` — **modify**: add tests for the new helpers.
- `app/api/ai/command/route.ts` — **create**: interpret endpoint.
- `app/api/ai/command/apply/route.ts` — **create**: apply endpoint.
- `app/api/ai/command/undo/route.ts` — **create**: undo endpoint.
- `components/home/CommandBox.tsx` — **create**: client UI.
- `app/page.tsx` — **modify**: render `<CommandBox />`.

Shared types live in `lib/ai.ts` and are imported by the routes and the component, so the contract is defined once.

---

## Task 1: Pure helpers and types in `lib/ai.ts`

**Files:**
- Modify: `lib/ai.ts` (append a new section at the end)
- Test: `lib/__tests__/ai.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `lib/__tests__/ai.test.ts`:

```ts
import {
  parseToolUses,
  validateAction,
  buildSummaryPrompt,
  type ProposedAction,
} from '../ai'

describe('parseToolUses', () => {
  const projectsById = { p1: { name: 'Mockingbird' } }

  it('maps create_task with known project_id to a project task', () => {
    const { taskActions, summaryRequests } = parseToolUses(
      [{ name: 'create_task', input: { title: 'Email the vet', project_id: 'p1' } }],
      projectsById,
    )
    expect(summaryRequests).toEqual([])
    expect(taskActions).toEqual([
      { kind: 'create_task', target: 'project', project_id: 'p1', project_name: 'Mockingbird', title: 'Email the vet' },
    ])
  })

  it('maps create_task with no project_id to a personal task', () => {
    const { taskActions } = parseToolUses(
      [{ name: 'create_task', input: { title: 'Buy stamps' } }],
      projectsById,
    )
    expect(taskActions[0]).toEqual({
      kind: 'create_task', target: 'personal', project_id: null, project_name: null, title: 'Buy stamps',
    })
  })

  it('treats an unknown project_id as a personal task', () => {
    const { taskActions } = parseToolUses(
      [{ name: 'create_task', input: { title: 'Do thing', project_id: 'nope' } }],
      projectsById,
    )
    expect(taskActions[0].target).toBe('personal')
    expect(taskActions[0].project_id).toBeNull()
  })

  it('emits multiple task actions from multiple tool uses', () => {
    const { taskActions } = parseToolUses(
      [
        { name: 'create_task', input: { title: 'A' } },
        { name: 'create_task', input: { title: 'B' } },
      ],
      projectsById,
    )
    expect(taskActions).toHaveLength(2)
  })

  it('collects summary requests with known project_id only', () => {
    const { summaryRequests } = parseToolUses(
      [
        { name: 'generate_project_summary', input: { project_id: 'p1', extra_notes: 'signed contract' } },
        { name: 'generate_project_summary', input: { project_id: 'ghost' } },
      ],
      projectsById,
    )
    expect(summaryRequests).toEqual([
      { project_id: 'p1', project_name: 'Mockingbird', extra_notes: 'signed contract' },
    ])
  })

  it('ignores tasks with a blank title', () => {
    const { taskActions } = parseToolUses(
      [{ name: 'create_task', input: { title: '   ' } }],
      projectsById,
    )
    expect(taskActions).toEqual([])
  })
})

describe('validateAction', () => {
  const ids = new Set(['p1'])

  it('accepts a personal task with a title', () => {
    const a: ProposedAction = { kind: 'create_task', target: 'personal', project_id: null, project_name: null, title: 'X' }
    expect(validateAction(a, ids)).toEqual({ ok: true })
  })

  it('rejects an empty title', () => {
    const a: ProposedAction = { kind: 'create_task', target: 'personal', project_id: null, project_name: null, title: '' }
    expect(validateAction(a, ids).ok).toBe(false)
  })

  it('rejects a project task whose project_id is unknown', () => {
    const a: ProposedAction = { kind: 'create_task', target: 'project', project_id: 'ghost', project_name: 'x', title: 'X' }
    expect(validateAction(a, ids).ok).toBe(false)
  })

  it('rejects a summary update for an unknown project', () => {
    const a: ProposedAction = { kind: 'update_summary', project_id: 'ghost', project_name: 'x', summary: 'hi' }
    expect(validateAction(a, ids).ok).toBe(false)
  })

  it('accepts a valid summary update', () => {
    const a: ProposedAction = { kind: 'update_summary', project_id: 'p1', project_name: 'M', summary: 'hi' }
    expect(validateAction(a, ids)).toEqual({ ok: true })
  })
})

describe('buildSummaryPrompt', () => {
  it('includes project name, stage, tasks, and extra notes', () => {
    const prompt = buildSummaryPrompt(
      { name: 'Mockingbird', stage: 'building', summary: 'old', tasks: [{ title: 'Ship MVP', completed: false }] },
      'we signed the contract',
    )
    expect(prompt).toContain('Mockingbird')
    expect(prompt).toContain('building')
    expect(prompt).toContain('Ship MVP')
    expect(prompt).toContain('we signed the contract')
  })

  it('handles no extra notes', () => {
    const prompt = buildSummaryPrompt(
      { name: 'X', stage: 'inbox', summary: null, tasks: [] },
      null,
    )
    expect(prompt).toContain('X')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/ai.test.ts`
Expected: FAIL — `parseToolUses`, `validateAction`, `buildSummaryPrompt` not exported.

- [ ] **Step 3: Implement the helpers**

Append to `lib/ai.ts`:

```ts
// ── Quick-capture command box ─────────────────────────────────────────────────

export type ProposedAction =
  | {
      kind: 'create_task'
      target: 'personal' | 'project'
      project_id: string | null
      project_name: string | null
      title: string
    }
  | {
      kind: 'update_summary'
      project_id: string
      project_name: string
      summary: string
    }

export type UndoEntry =
  | { kind: 'delete_row'; table: 'personal_tasks' | 'tasks'; id: string }
  | { kind: 'restore_summary'; project_id: string; prev_summary: string | null }

export interface ToolUse {
  name: string
  input: Record<string, unknown>
}

export const COMMAND_SYSTEM = `You are the quick-capture assistant for SD VetStudio's Mission Control, used by Dr Shaan and Dr Deb. Turn the user's free text into tool calls.

Rules:
- To capture a to-do, call create_task. If the text clearly refers to one of the listed projects, set project_id to that project's id; otherwise omit project_id (it becomes a personal task).
- Create one create_task call per distinct task.
- To (re)write a project's summary, call generate_project_summary with that project's id and any extra context the user gave in extra_notes.
- Only use project ids from the provided list. If unsure which project, omit project_id (personal task).
- If the text is not an actionable request, do not call any tool.`

export const COMMAND_TOOLS = [
  {
    name: 'create_task',
    description: 'Create a to-do. Set project_id when the task belongs to a named project; omit for a personal next-step task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short actionable task title' },
        project_id: { type: 'string', description: 'Id of the project this task belongs to, if any' },
      },
      required: ['title'],
    },
  },
  {
    name: 'generate_project_summary',
    description: "Write or rewrite a project's summary from its data plus any extra notes.",
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Id of the project to summarise' },
        extra_notes: { type: 'string', description: 'Extra context the user provided' },
      },
      required: ['project_id'],
    },
  },
]

interface ParsedTools {
  taskActions: Extract<ProposedAction, { kind: 'create_task' }>[]
  summaryRequests: { project_id: string; project_name: string; extra_notes: string | null }[]
}

export function parseToolUses(
  toolUses: ToolUse[],
  projectsById: Record<string, { name: string }>,
): ParsedTools {
  const taskActions: ParsedTools['taskActions'] = []
  const summaryRequests: ParsedTools['summaryRequests'] = []

  for (const tu of toolUses) {
    if (tu.name === 'create_task') {
      const title = String(tu.input.title ?? '').trim()
      if (!title) continue
      const rawId = tu.input.project_id ? String(tu.input.project_id) : null
      const known = rawId && projectsById[rawId] ? rawId : null
      taskActions.push({
        kind: 'create_task',
        target: known ? 'project' : 'personal',
        project_id: known,
        project_name: known ? projectsById[known].name : null,
        title,
      })
    } else if (tu.name === 'generate_project_summary') {
      const rawId = tu.input.project_id ? String(tu.input.project_id) : null
      if (!rawId || !projectsById[rawId]) continue
      const notes = tu.input.extra_notes ? String(tu.input.extra_notes).trim() : null
      summaryRequests.push({
        project_id: rawId,
        project_name: projectsById[rawId].name,
        extra_notes: notes || null,
      })
    }
  }

  return { taskActions, summaryRequests }
}

export function validateAction(
  action: ProposedAction,
  projectIds: Set<string>,
): { ok: true } | { ok: false; error: string } {
  if (action.kind === 'create_task') {
    if (!action.title.trim()) return { ok: false, error: 'Task title is empty' }
    if (action.target === 'project' && (!action.project_id || !projectIds.has(action.project_id))) {
      return { ok: false, error: 'Unknown project' }
    }
    return { ok: true }
  }
  // update_summary
  if (!projectIds.has(action.project_id)) return { ok: false, error: 'Unknown project' }
  if (!action.summary.trim()) return { ok: false, error: 'Summary is empty' }
  return { ok: true }
}

export function buildSummaryPrompt(
  project: { name: string; stage: string; summary: string | null; tasks: { title: string; completed: boolean }[] },
  extraNotes: string | null,
): string {
  const tasks = project.tasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.title}`).join('\n') || 'None'
  return (
    `Project: ${project.name} (${project.stage})\n` +
    `Existing summary: ${project.summary ?? 'None'}\n` +
    `Tasks:\n${tasks}\n` +
    `Extra notes from user: ${extraNotes ?? 'None'}`
  )
}

export const SUMMARY_SYSTEM = `You write concise project summaries for SD VetStudio's Mission Control. Given a project's data and any extra notes, write a clear 2-3 sentence summary of what the project is and where it stands. Plain text only, no preamble, no markdown headings.`
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/ai.test.ts`
Expected: PASS (all new + existing tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ai.ts lib/__tests__/ai.test.ts
git commit -m "feat: command-box pure helpers (parse, validate, summary prompt)"
```

---

## Task 2: Interpret route `app/api/ai/command/route.ts`

**Files:**
- Create: `app/api/ai/command/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjects } from '@/lib/queries/projects'
import { getProject } from '@/lib/queries/projects'
import {
  COMMAND_SYSTEM,
  COMMAND_TOOLS,
  SUMMARY_SYSTEM,
  buildSummaryPrompt,
  parseToolUses,
  type ProposedAction,
  type ToolUse,
} from '@/lib/ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const projects = await getProjects()
  const projectsById = Object.fromEntries(projects.map(p => [p.id, { name: p.name }]))
  const projectList = projects.map(p => `- ${p.name} (id: ${p.id}, stage: ${p.stage})`).join('\n') || 'None'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: COMMAND_SYSTEM,
    tools: COMMAND_TOOLS,
    messages: [{ role: 'user', content: `Projects:\n${projectList}\n\nUser request:\n${text}` }],
  })

  const toolUses: ToolUse[] = message.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    .map(b => ({ name: b.name, input: b.input as Record<string, unknown> }))

  const { taskActions, summaryRequests } = parseToolUses(toolUses, projectsById)

  const summaryActions: ProposedAction[] = []
  for (const reqSummary of summaryRequests) {
    const project = await getProject(reqSummary.project_id)
    if (!project) continue
    const prompt = buildSummaryPrompt(
      {
        name: project.name,
        stage: project.stage,
        summary: project.summary,
        tasks: (project.tasks ?? []).map(t => ({ title: t.title, completed: t.completed })),
      },
      reqSummary.extra_notes,
    )
    const sum = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })
    const summary = sum.content[0]?.type === 'text' ? sum.content[0].text.trim() : ''
    if (summary) {
      summaryActions.push({
        kind: 'update_summary',
        project_id: reqSummary.project_id,
        project_name: reqSummary.project_name,
        summary,
      })
    }
  }

  const actions: ProposedAction[] = [...taskActions, ...summaryActions]
  const responseMessage =
    actions.length === 0
      ? "I couldn't turn that into an action. Try e.g. \"add a task to email the vet\" or \"summarise the Mockingbird project\"."
      : null

  return NextResponse.json({ actions, message: responseMessage })
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/command/route.ts
git commit -m "feat: command-box interpret route"
```

---

## Task 3: Apply route `app/api/ai/command/apply/route.ts`

**Files:**
- Create: `app/api/ai/command/apply/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjects } from '@/lib/queries/projects'
import { validateAction, type ProposedAction, type UndoEntry } from '@/lib/ai'

type ApplyResult =
  | { ok: true; label: string; undo: UndoEntry }
  | { ok: false; label: string; error: string }

function labelFor(a: ProposedAction): string {
  if (a.kind === 'create_task') {
    return a.target === 'project'
      ? `Task on ${a.project_name}: ${a.title}`
      : `Personal task: ${a.title}`
  }
  return `Summary updated: ${a.project_name}`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { actions } = (await req.json()) as { actions: ProposedAction[] }
  if (!Array.isArray(actions)) {
    return NextResponse.json({ error: 'actions array required' }, { status: 400 })
  }

  const projectIds = new Set((await getProjects()).map(p => p.id))
  const results: ApplyResult[] = []

  for (const action of actions) {
    const label = labelFor(action)
    const valid = validateAction(action, projectIds)
    if (!valid.ok) {
      results.push({ ok: false, label, error: valid.error })
      continue
    }

    try {
      if (action.kind === 'create_task') {
        if (action.target === 'personal') {
          const { data, error } = await supabase
            .from('personal_tasks')
            .insert({ title: action.title, owner_id: user.id, project_id: null })
            .select('id')
            .single()
          if (error) throw error
          results.push({ ok: true, label, undo: { kind: 'delete_row', table: 'personal_tasks', id: data.id } })
        } else {
          const { data, error } = await supabase
            .from('tasks')
            .insert({ title: action.title, project_id: action.project_id })
            .select('id')
            .single()
          if (error) throw error
          results.push({ ok: true, label, undo: { kind: 'delete_row', table: 'tasks', id: data.id } })
        }
      } else {
        // update_summary — capture previous value for undo
        const { data: prev, error: readErr } = await supabase
          .from('projects')
          .select('summary')
          .eq('id', action.project_id)
          .single()
        if (readErr) throw readErr
        const { error } = await supabase
          .from('projects')
          .update({ summary: action.summary, updated_by: user.id })
          .eq('id', action.project_id)
        if (error) throw error
        results.push({
          ok: true,
          label,
          undo: { kind: 'restore_summary', project_id: action.project_id, prev_summary: prev.summary ?? null },
        })
      }
    } catch (e) {
      results.push({ ok: false, label, error: e instanceof Error ? e.message : 'Write failed' })
    }
  }

  return NextResponse.json({ results })
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/command/apply/route.ts
git commit -m "feat: command-box apply route with undo receipt"
```

---

## Task 4: Undo route `app/api/ai/command/undo/route.ts`

**Files:**
- Create: `app/api/ai/command/undo/route.ts`

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UndoEntry } from '@/lib/ai'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { undo } = (await req.json()) as { undo: UndoEntry[] }
  if (!Array.isArray(undo)) {
    return NextResponse.json({ error: 'undo array required' }, { status: 400 })
  }

  const errors: string[] = []
  for (const entry of undo) {
    try {
      if (entry.kind === 'delete_row') {
        const { error } = await supabase.from(entry.table).delete().eq('id', entry.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projects')
          .update({ summary: entry.prev_summary })
          .eq('id', entry.project_id)
        if (error) throw error
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Undo failed')
    }
  }

  return NextResponse.json({ ok: errors.length === 0, errors })
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/command/undo/route.ts
git commit -m "feat: command-box undo route"
```

---

## Task 5: `CommandBox` client component

**Files:**
- Create: `components/home/CommandBox.tsx`

- [ ] **Step 1: Implement the component**

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProposedAction, UndoEntry } from '@/lib/ai'

type Phase = 'idle' | 'interpreting' | 'preview' | 'applying' | 'done' | 'error'

export default function CommandBox() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [actions, setActions] = useState<ProposedAction[]>([])
  const [undoEntries, setUndoEntries] = useState<UndoEntry[]>([])
  const [note, setNote] = useState<string | null>(null)

  async function interpret() {
    if (!text.trim()) return
    setPhase('interpreting'); setNote(null)
    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Interpret failed')
      const data = await res.json() as { actions: ProposedAction[]; message: string | null }
      if (!data.actions.length) { setNote(data.message); setPhase('idle'); return }
      setActions(data.actions); setPhase('preview')
    } catch {
      setNote('Something went wrong interpreting that.'); setPhase('error')
    }
  }

  async function confirm() {
    setPhase('applying')
    try {
      const res = await fetch('/api/ai/command/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      })
      if (!res.ok) throw new Error('Apply failed')
      const data = await res.json() as { results: ({ ok: boolean; label: string; error?: string; undo?: UndoEntry })[] }
      const undos = data.results.filter(r => r.ok && r.undo).map(r => r.undo as UndoEntry)
      const failed = data.results.filter(r => !r.ok)
      setUndoEntries(undos)
      setNote(failed.length ? `${undos.length} applied, ${failed.length} failed.` : `${undos.length} applied.`)
      setPhase('done'); setText(''); setActions([]); router.refresh()
    } catch {
      setNote('Something went wrong applying that.'); setPhase('error')
    }
  }

  async function undo() {
    if (!undoEntries.length) return
    await fetch('/api/ai/command/undo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ undo: undoEntries }),
    })
    setUndoEntries([]); setNote('Undone.'); setPhase('idle'); router.refresh()
  }

  function cancel() { setActions([]); setPhase('idle') }

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid #D9D2C2' }}>
      <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#6B7A82' }}>
        Quick capture
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && phase !== 'interpreting') interpret() }}
          disabled={phase === 'interpreting' || phase === 'applying'}
          placeholder="e.g. add a task to email the vet · summarise the Mockingbird project"
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2"
          style={{ border: '1px solid #E5DFD0', background: '#FAF8F2', color: '#2A3A48' }}
        />
        <button
          onClick={interpret}
          disabled={!text.trim() || phase === 'interpreting' || phase === 'applying'}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          {phase === 'interpreting' ? 'Reading…' : 'Go'}
        </button>
      </div>

      {note && phase !== 'preview' && (
        <div className="mt-3 text-[13px] flex items-center gap-3" style={{ color: '#6B7A82' }}>
          <span>{note}</span>
          {phase === 'done' && undoEntries.length > 0 && (
            <button onClick={undo} className="font-semibold underline" style={{ color: '#1E6B5E' }}>Undo</button>
          )}
        </div>
      )}

      {phase === 'preview' && (
        <div className="mt-4 flex flex-col gap-2">
          {actions.map((a, i) => (
            <div key={i} className="rounded-xl px-3.5 py-3 text-sm" style={{ background: '#FAF8F2', border: '1px solid #E5DFD0' }}>
              {a.kind === 'create_task' ? (
                <span>✅ New {a.target === 'project' ? `task on ${a.project_name}` : 'personal task'}: <strong>{a.title}</strong></span>
              ) : (
                <div>
                  <div className="font-semibold mb-1">📝 Update summary for {a.project_name}:</div>
                  <div style={{ color: '#2A3A48' }}>{a.summary}</div>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={confirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#1E6B5E' }}>
              Confirm
            </button>
            <button onClick={cancel} className="px-4 py-2 text-sm" style={{ color: '#9AA5AC' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/CommandBox.tsx
git commit -m "feat: CommandBox client component"
```

---

## Task 6: Wire into the home page and verify

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the import**

In `app/page.tsx`, after the `Scratchpad` import line, add:

```tsx
import CommandBox from '@/components/home/CommandBox'
```

- [ ] **Step 2: Render it above the Scratchpad**

In `app/page.tsx`, replace:

```tsx
        {/* Scratchpad */}
        <Scratchpad initialText={scratchpadText} />
```

with:

```tsx
        {/* Quick capture (AI) */}
        <CommandBox />

        {/* Scratchpad */}
        <Scratchpad initialText={scratchpadText} />
```

- [ ] **Step 3: Type-check and run the test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass.

- [ ] **Step 4: Manual verification (auth required)**

The home page is behind the passcode login, so verify in the running app:
1. `npm run dev`, log in, open the home page.
2. Type "add a task to email the vet about the trial" → Go → preview shows a personal task → Confirm → appears, "Undo" shown → click Undo → it's removed.
3. Type "add a task to Mockingbird: draft the onboarding email" (use a real project name) → preview shows a project task on that project.
4. Type "summarise the <real project> project, note we signed the contract" → preview shows generated summary → Confirm → project summary updates → Undo restores the old summary.
5. Type gibberish → friendly "couldn't turn that into an action" message.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: render CommandBox on home page"
```

---

## Self-Review Notes

- **Spec coverage:** interpret/apply/undo routes (Tasks 2-4), two tools create_task + generate_project_summary (Task 1 defs, Task 2 wiring), preview-then-confirm + persistent Undo (Task 5), project-vs-personal "Claude decides" (parseToolUses), summary from data + notes (buildSummaryPrompt + Task 2 second call), per-action error isolation (apply loop), gentle no-action message (Task 2 + Task 5). All covered.
- **Type consistency:** `ProposedAction`, `UndoEntry`, `ToolUse` defined once in `lib/ai.ts` and imported everywhere. `parseToolUses` / `validateAction` / `buildSummaryPrompt` signatures match their tests.
- **Note on Supabase typing:** the project uses loosely-typed Supabase clients; `.insert(...).select('id').single()` returns `data.id`. If strict typing complains, cast the row (`(data as { id: string }).id`) — kept out of the happy path for readability.
```
