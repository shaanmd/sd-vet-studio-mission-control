# Revenue-First Dashboard — Phase 5: Integrations & AI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Claude AI for task suggestions and win summaries, sync GitHub/Vercel deploy status hourly, and add Slack slash commands + daily digest.

**Architecture:** Three independent subsystems — each can be implemented and deployed separately. AI routes call Claude API server-side. GitHub/Vercel sync runs as a Vercel cron. Slack bot handles slash commands via Next.js API routes. All use established patterns from Phases 1–4.

**Tech Stack:** Next.js 15, Supabase, Tailwind CSS 4, TypeScript, @anthropic-ai/sdk, Vercel cron. No additional SDKs for GitHub, Vercel, or Slack APIs.

**Prerequisite:** Phases 1–4 complete. The following env vars must be set before each subsystem:
- Subsystem A (AI): `ANTHROPIC_API_KEY`
- Subsystem B (GitHub/Vercel): `GITHUB_TOKEN`, `VERCEL_API_TOKEN`, `VERCEL_TEAM_ID` (optional), `CRON_SECRET`
- Subsystem C (Slack): `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID`, `CRON_SECRET`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/ai.ts` | Prompt construction pure functions (testable) |
| Create | `app/api/ai/next-step/route.ts` | Claude next-step suggestion |
| Create | `app/api/ai/win-summary/route.ts` | Claude win summary |
| Create | `app/api/ai/tag-energy/route.ts` | Claude energy tagger |
| Modify | `components/project-detail/AIAnalysisPanel.tsx` | Add "Generate with AI" button |
| Modify | `app/log/page.tsx` | Add AI win summary card |
| Create | `lib/github.ts` | GitHub + Vercel API fetch functions (testable) |
| Create | `app/api/cron/sync-github/route.ts` | Hourly cron handler |
| Create | `vercel.json` | Cron schedule config |
| Modify | `app/projects/[id]/page.tsx` | Wire AutoStatus component |
| Create | `lib/slack.ts` | Slack message builders (testable) |
| Create | `app/api/slack/commands/route.ts` | Slash command handler |
| Create | `app/api/cron/slack-digest/route.ts` | Daily digest cron |
| Modify | `app/settings/page.tsx` | Show Slack/GitHub connection status |
| Create | `lib/__tests__/ai.test.ts` | Tests for prompt builders |
| Create | `lib/__tests__/github.test.ts` | Tests for GitHub/Vercel parsers |
| Create | `lib/__tests__/slack.test.ts` | Tests for Slack message builders |

---

## Task 1: Install packages + env setup

- [ ] **1.1** Install the Anthropic SDK

```bash
npm install @anthropic-ai/sdk
```

Expected output:
```
added 12 packages, and audited 487 packages in 4s
```

- [ ] **1.2** Add all new env vars to `.env.local`. Open the file and append:

```bash
# Subsystem A — AI
ANTHROPIC_API_KEY=sk-ant-...

# Subsystem B — GitHub / Vercel sync
GITHUB_TOKEN=ghp_...
VERCEL_API_TOKEN=...
VERCEL_TEAM_ID=team_...    # optional — omit if personal account
CRON_SECRET=a-long-random-secret-you-generate

# Subsystem C — Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_CHANNEL_ID=C0123456789
```

- [ ] **1.3** Create `.env.example` (committed to git, no real values):

```bash
# Subsystem A — AI
ANTHROPIC_API_KEY=

# Subsystem B — GitHub / Vercel sync
GITHUB_TOKEN=
VERCEL_API_TOKEN=
VERCEL_TEAM_ID=
CRON_SECRET=

# Subsystem C — Slack
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
SLACK_CHANNEL_ID=
```

- [ ] **1.4** Verify TypeScript sees the new SDK:

```bash
npx tsc --noEmit
```

Expected output: no errors.

---

## Task 2: AI prompt library + tests

### 2.1 Create `lib/ai.ts`

```typescript
// lib/ai.ts
// Pure prompt construction functions — no API calls, fully testable.

import type { Project, Task, ActivityLogEntry } from '@/lib/types/database'

// ── Next-step suggestion ──────────────────────────────────────────────────────

export function buildNextStepPrompt(
  project: Pick<Project, 'name' | 'stage' | 'summary' | 'revenue_score'>,
  tasks: Pick<Task, 'title' | 'completed'>[],
): string {
  const pending = tasks
    .filter(t => !t.completed)
    .map(t => `- ${t.title}`)
    .join('\n')
  return (
    `Project: ${project.name} (${project.stage})\n` +
    `Summary: ${project.summary ?? 'No summary'}\n` +
    `Revenue score: ${project.revenue_score}\n` +
    `Pending tasks:\n${pending || 'None'}`
  )
}

export const NEXT_STEP_SYSTEM = `You are a lean startup advisor for SD VetStudio, a veterinary digital health company run by Dr Shaan Mocke and Dr Deb Prattley. Your job: suggest ONE specific next action to move a project toward revenue.

Respond with JSON only:
{"task": "specific actionable title under 10 words", "energy": "low|medium|high", "why": "one sentence reason focused on revenue impact"}

Energy guide:
- low: brain-off, 5-10 min (checking stats, copy-paste tasks)
- medium: needs focus, 15-30 min (writing, designing, configuring)
- high: deep work, 30+ min (building, strategy, complex decisions)`

// ── Win summary ───────────────────────────────────────────────────────────────

export function buildWinSummaryPrompt(
  wins: Pick<ActivityLogEntry, 'description' | 'created_at'>[],
): string {
  return wins
    .slice(0, 10)
    .map(
      w =>
        `- ${w.description ?? 'Win logged'} (${new Date(w.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})`,
    )
    .join('\n')
}

export const WIN_SUMMARY_SYSTEM = `You are a warm, energising coach for Dr Shaan and Dr Deb at SD VetStudio. Write a SHORT celebration of their recent wins — 2-3 sentences, specific, warm, focused on momentum. Address them as "you two". No emojis.`

// ── Energy tagger ─────────────────────────────────────────────────────────────

export function buildEnergyTagPrompt(taskTitle: string): string {
  return `Task: ${taskTitle}`
}

export const ENERGY_TAG_SYSTEM = `Tag this task with an energy level for veterinary clinic owners running a SaaS business.
Energy levels:
- low: brain-off execution, 5-10 min
- medium: focused work, 15-30 min
- high: deep strategic work, 30+ min

Respond with exactly one word: low, medium, or high`

export function parseEnergyResponse(response: string): 'low' | 'medium' | 'high' {
  const cleaned = response.trim().toLowerCase()
  if (cleaned === 'low' || cleaned === 'medium' || cleaned === 'high') return cleaned
  return 'medium'
}

// ── Next-step response parser ─────────────────────────────────────────────────

export interface NextStepResult {
  task: string
  energy: 'low' | 'medium' | 'high'
  why: string
}

export function parseNextStepResponse(raw: string): NextStepResult {
  try {
    // Strip markdown code fences if Claude wraps in ```json
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const energy =
      parsed.energy === 'low' || parsed.energy === 'high' ? parsed.energy : 'medium'
    return {
      task: String(parsed.task ?? 'Review project status'),
      energy,
      why: String(parsed.why ?? ''),
    }
  } catch {
    return { task: raw.trim().slice(0, 80), energy: 'medium', why: '' }
  }
}
```

### 2.2 Create `lib/__tests__/ai.test.ts`

```typescript
// lib/__tests__/ai.test.ts
import { describe, it, expect } from 'vitest'
import {
  buildNextStepPrompt,
  buildWinSummaryPrompt,
  buildEnergyTagPrompt,
  parseEnergyResponse,
  parseNextStepResponse,
} from '../ai'
import type { Project, Task, ActivityLogEntry } from '@/lib/types/database'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'VetRehab App',
  emoji: '🐾',
  summary: 'Rehab tracking for vets',
  stage: 'building',
  pinned: false,
  revenue_score: 'high',
  revenue_stream: 'subscription',
  revenue_per_conversion: 49,
  github_repo: 'sdvetstudio/vetrehab',
  vercel_project_id: null,
  live_url: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  project_id: 'p1',
  title: 'Set up Stripe',
  assigned_to: null,
  is_shared: false,
  is_next_step: false,
  energy: 'medium',
  completed: false,
  completed_at: null,
  completed_by: null,
  sort_order: 0,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

const makeWin = (overrides: Partial<ActivityLogEntry> = {}): ActivityLogEntry => ({
  id: 'w1',
  project_id: 'p1',
  actor_id: 'u1',
  action: 'revenue_logged',
  description: 'First paying customer signed up',
  metadata: null,
  is_win: true,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

// ── buildNextStepPrompt ───────────────────────────────────────────────────────

describe('buildNextStepPrompt', () => {
  it('includes project name and stage', () => {
    const prompt = buildNextStepPrompt(makeProject(), [makeTask()])
    expect(prompt).toContain('VetRehab App (building)')
  })

  it('includes summary when present', () => {
    const prompt = buildNextStepPrompt(makeProject(), [])
    expect(prompt).toContain('Rehab tracking for vets')
  })

  it('falls back to "No summary" when summary is null', () => {
    const prompt = buildNextStepPrompt(makeProject({ summary: null }), [])
    expect(prompt).toContain('Summary: No summary')
  })

  it('lists only pending tasks', () => {
    const tasks = [
      makeTask({ title: 'Set up Stripe', completed: false }),
      makeTask({ id: 't2', title: 'Deploy to prod', completed: true }),
    ]
    const prompt = buildNextStepPrompt(makeProject(), tasks)
    expect(prompt).toContain('- Set up Stripe')
    expect(prompt).not.toContain('Deploy to prod')
  })

  it('shows "None" when all tasks are completed', () => {
    const tasks = [makeTask({ completed: true })]
    const prompt = buildNextStepPrompt(makeProject(), tasks)
    expect(prompt).toContain('Pending tasks:\nNone')
  })

  it('includes revenue_score', () => {
    const prompt = buildNextStepPrompt(makeProject({ revenue_score: 'high' }), [])
    expect(prompt).toContain('Revenue score: high')
  })
})

// ── buildWinSummaryPrompt ────────────────────────────────────────────────────

describe('buildWinSummaryPrompt', () => {
  it('formats wins with description and date', () => {
    const prompt = buildWinSummaryPrompt([makeWin()])
    expect(prompt).toContain('First paying customer signed up')
    expect(prompt).toContain('1 Apr')
  })

  it('falls back to "Win logged" when description is null', () => {
    const prompt = buildWinSummaryPrompt([makeWin({ description: null })])
    expect(prompt).toContain('Win logged')
  })

  it('limits to 10 wins', () => {
    const wins = Array.from({ length: 15 }, (_, i) =>
      makeWin({ id: `w${i}`, description: `Win ${i}` }),
    )
    const prompt = buildWinSummaryPrompt(wins)
    const lines = prompt.split('\n')
    expect(lines).toHaveLength(10)
  })

  it('returns empty string for empty array', () => {
    expect(buildWinSummaryPrompt([])).toBe('')
  })
})

// ── buildEnergyTagPrompt ──────────────────────────────────────────────────────

describe('buildEnergyTagPrompt', () => {
  it('wraps task title in expected format', () => {
    const prompt = buildEnergyTagPrompt('Write landing page copy')
    expect(prompt).toBe('Task: Write landing page copy')
  })
})

// ── parseEnergyResponse ───────────────────────────────────────────────────────

describe('parseEnergyResponse', () => {
  it('returns "low" for "low"', () => {
    expect(parseEnergyResponse('low')).toBe('low')
  })

  it('returns "medium" for "medium"', () => {
    expect(parseEnergyResponse('medium')).toBe('medium')
  })

  it('returns "high" for "high"', () => {
    expect(parseEnergyResponse('high')).toBe('high')
  })

  it('trims whitespace', () => {
    expect(parseEnergyResponse('  high  \n')).toBe('high')
  })

  it('is case-insensitive', () => {
    expect(parseEnergyResponse('HIGH')).toBe('high')
    expect(parseEnergyResponse('Low')).toBe('low')
  })

  it('defaults to "medium" for unexpected values', () => {
    expect(parseEnergyResponse('moderate')).toBe('medium')
    expect(parseEnergyResponse('')).toBe('medium')
    expect(parseEnergyResponse('Level: high')).toBe('medium')
  })
})

// ── parseNextStepResponse ─────────────────────────────────────────────────────

describe('parseNextStepResponse', () => {
  it('parses valid JSON', () => {
    const raw = JSON.stringify({
      task: 'Add Stripe checkout to onboarding',
      energy: 'high',
      why: 'Unlocks paying customers immediately',
    })
    const result = parseNextStepResponse(raw)
    expect(result.task).toBe('Add Stripe checkout to onboarding')
    expect(result.energy).toBe('high')
    expect(result.why).toBe('Unlocks paying customers immediately')
  })

  it('strips markdown code fences', () => {
    const raw =
      '```json\n{"task":"Email 5 beta users","energy":"low","why":"Quick feedback loop"}\n```'
    const result = parseNextStepResponse(raw)
    expect(result.task).toBe('Email 5 beta users')
    expect(result.energy).toBe('low')
  })

  it('defaults energy to "medium" for unexpected values', () => {
    const raw = JSON.stringify({ task: 'Do something', energy: 'extreme', why: 'test' })
    const result = parseNextStepResponse(raw)
    expect(result.energy).toBe('medium')
  })

  it('falls back gracefully on invalid JSON', () => {
    const result = parseNextStepResponse('Sorry, I cannot help with that.')
    expect(result.task).toBe('Sorry, I cannot help with that.')
    expect(result.energy).toBe('medium')
    expect(result.why).toBe('')
  })

  it('truncates fallback task to 80 chars', () => {
    const longText = 'A'.repeat(100)
    const result = parseNextStepResponse(longText)
    expect(result.task).toHaveLength(80)
  })
})
```

- [ ] **2.3** Run tests to confirm they pass:

```bash
npx vitest run lib/__tests__/ai.test.ts
```

Expected output:
```
 ✓ lib/__tests__/ai.test.ts (16 tests) 12ms

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Start at  08:xx:xx
   Duration  xxx ms
```

---

## Task 3: Claude AI API routes

### 3.1 Create `app/api/ai/next-step/route.ts`

```typescript
// app/api/ai/next-step/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  buildNextStepPrompt,
  NEXT_STEP_SYSTEM,
  parseNextStepResponse,
} from '@/lib/ai'
import type { Project, Task } from '@/lib/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const project: Pick<Project, 'name' | 'stage' | 'summary' | 'revenue_score'> =
    body.project
  const tasks: Pick<Task, 'title' | 'completed'>[] = body.tasks ?? []

  if (!project?.name) {
    return NextResponse.json({ error: 'project is required' }, { status: 400 })
  }

  const userPrompt = buildNextStepPrompt(project, tasks)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: NEXT_STEP_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw =
    message.content[0]?.type === 'text' ? message.content[0].text : ''
  const result = parseNextStepResponse(raw)

  return NextResponse.json(result)
}
```

### 3.2 Create `app/api/ai/win-summary/route.ts`

```typescript
// app/api/ai/win-summary/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildWinSummaryPrompt, WIN_SUMMARY_SYSTEM } from '@/lib/ai'
import type { ActivityLogEntry } from '@/lib/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const wins: Pick<ActivityLogEntry, 'description' | 'created_at'>[] =
    body.wins ?? []

  if (wins.length === 0) {
    return NextResponse.json({ summary: 'No wins logged yet — get out there!' })
  }

  const userPrompt = buildWinSummaryPrompt(wins)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: WIN_SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const summary =
    message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

  return NextResponse.json({ summary })
}
```

### 3.3 Create `app/api/ai/tag-energy/route.ts`

```typescript
// app/api/ai/tag-energy/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEnergyTagPrompt, ENERGY_TAG_SYSTEM, parseEnergyResponse } from '@/lib/ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const taskTitle: string = body.title ?? ''

  if (!taskTitle.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const userPrompt = buildEnergyTagPrompt(taskTitle)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16,
    system: ENERGY_TAG_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw =
    message.content[0]?.type === 'text' ? message.content[0].text : ''
  const energy = parseEnergyResponse(raw)

  return NextResponse.json({ energy })
}
```

---

## Task 4: AI UI wiring

### 4.1 Modify `components/project-detail/AIAnalysisPanel.tsx`

Replace the existing file with the version below. The key addition is a "Generate with AI" button that:
1. Calls `POST /api/ai/next-step` to get a suggestion
2. Pre-fills the form fields from the AI response
3. Still allows manual editing before saving

```typescript
// components/project-detail/AIAnalysisPanel.tsx
'use client'
import { useState } from 'react'
import type { ProjectAnalysis } from '@/lib/types/database'

interface Props {
  projectId: string
  projectName: string
  projectStage: string
  projectSummary: string | null
  projectRevenueScore: string
  pendingTasks: { title: string; completed: boolean }[]
  analysis: ProjectAnalysis | null
  onSave: (data: {
    income_potential: string
    build_difficulty: string
    recommendation: string
    raw_output: string
  }) => Promise<void>
}

export default function AIAnalysisPanel({
  projectId,
  projectName,
  projectStage,
  projectSummary,
  projectRevenueScore,
  pendingTasks,
  analysis,
  onSave,
}: Props) {
  const [pasting, setPasting] = useState(false)
  const [raw, setRaw] = useState('')
  const [income, setIncome] = useState(analysis?.income_potential ?? '')
  const [difficulty, setDifficulty] = useState(analysis?.build_difficulty ?? '')
  const [recommendation, setRecommendation] = useState(analysis?.recommendation ?? '')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai/next-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: {
            name: projectName,
            stage: projectStage,
            summary: projectSummary,
            revenue_score: projectRevenueScore,
          },
          tasks: pendingTasks,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Pre-fill fields from AI response
      setRecommendation(data.task ?? '')
      setIncome(
        projectRevenueScore === 'high'
          ? 'High — strong revenue potential'
          : projectRevenueScore === 'medium'
          ? 'Medium — moderate revenue potential'
          : 'Low — early stage',
      )
      setDifficulty(`Energy: ${data.energy ?? 'medium'}`)
      setRaw(JSON.stringify(data, null, 2))
      setPasting(true)
    } catch (err) {
      setAiError('AI generation failed. You can still paste results manually.')
      setPasting(true)
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    await onSave({ income_potential: income, build_difficulty: difficulty, recommendation, raw_output: raw })
    setSaving(false)
    setPasting(false)
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700 text-sm">🎯 AI Project Analysis</h3>
        {!pasting && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="text-xs bg-teal-700 text-white px-2.5 py-1 rounded-lg font-medium disabled:opacity-50"
            >
              {generating ? 'Generating…' : '✨ Generate with AI'}
            </button>
            <a
              href="https://sooper-dooper-project-prioritizer.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-600 font-medium"
            >
              Manual ↗
            </a>
          </div>
        )}
      </div>

      {aiError && (
        <p className="text-xs text-red-500 mb-2">{aiError}</p>
      )}

      {analysis && !pasting ? (
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase">Income potential</span>
            <p className="text-gray-800">{analysis.income_potential}</p>
          </div>
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase">Build difficulty</span>
            <p className="text-gray-800">{analysis.build_difficulty}</p>
          </div>
          <div>
            <span className="font-medium text-gray-500 text-xs uppercase">Recommendation</span>
            <p className="text-gray-800">{analysis.recommendation}</p>
          </div>
          <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
            <span>Last analysed {new Date(analysis.analysed_at).toLocaleDateString('en-AU')}</span>
            <button onClick={() => setPasting(true)} className="text-teal-600 font-medium">
              Re-analyse →
            </button>
          </div>
        </div>
      ) : !pasting ? (
        <div className="text-sm text-gray-400 flex flex-col gap-2">
          <p>No analysis yet. Generate with AI or run the prioritizer and paste results.</p>
          <button
            onClick={() => setPasting(true)}
            className="self-start text-teal-600 font-medium text-sm"
          >
            Paste results →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Income potential</label>
            <input
              value={income}
              onChange={e => setIncome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. High — recurring subscription model"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Build difficulty</label>
            <input
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Medium — 4-6 weeks"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Recommendation</label>
            <input
              value={recommendation}
              onChange={e => setRecommendation(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g. Prioritise — high ROI"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Raw output (optional)</label>
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Paste full output from the tool here"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPasting(false)}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 4.2 Update `app/projects/[id]/page.tsx` to pass new props to AIAnalysisPanel

The `AIAnalysisPanel` now needs `projectName`, `projectStage`, `projectSummary`, `projectRevenueScore`, and `pendingTasks`. Update the JSX in `app/projects/[id]/page.tsx`:

Find this block:
```tsx
      {/* AI Analysis */}
      <AIAnalysisPanel projectId={id} analysis={analysis} onSave={handleSaveAnalysis} />
```

Replace with:
```tsx
      {/* AI Analysis */}
      <AIAnalysisPanel
        projectId={id}
        projectName={project.name}
        projectStage={project.stage}
        projectSummary={project.summary}
        projectRevenueScore={project.revenue_score}
        pendingTasks={activeTasks.map(t => ({ title: t.title, completed: t.completed }))}
        analysis={analysis}
        onSave={handleSaveAnalysis}
      />
```

### 4.3 Add AI win summary card to `app/log/page.tsx`

Replace the existing file with:

```typescript
// app/log/page.tsx
'use client'
import { useState, useEffect } from 'react'
import ActivityFeed from '@/components/log/ActivityFeed'
import WinWall from '@/components/log/WinWall'

export default function LogPage() {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')
  const [activities, setActivities] = useState<any[]>([])
  const [wins, setWins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/log/activity').then(r => r.json()),
      fetch('/api/log/wins').then(r => r.json()),
    ]).then(([a, w]) => {
      setActivities(Array.isArray(a) ? a : [])
      setWins(Array.isArray(w) ? w : [])
      setLoading(false)
    })
  }, [])

  async function handleGenerateSummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ai/win-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wins }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAiSummary(data.summary ?? null)
    } catch {
      setAiSummary('Could not generate summary. Try again in a moment.')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏆 Log & Wins</h1>

      <div className="flex bg-teal-50 rounded-xl p-1 mb-5 gap-1">
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'activity' ? 'bg-teal-700 text-white' : 'text-teal-700'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab('wins')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'wins' ? 'bg-teal-700 text-white' : 'text-teal-700'
          }`}
        >
          🏆 Win Wall
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}

      {!loading && tab === 'wins' && wins.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
          {aiSummary ? (
            <>
              <p className="text-sm text-amber-900 leading-relaxed">{aiSummary}</p>
              <button
                onClick={() => setAiSummary(null)}
                className="text-xs text-amber-600 mt-2 font-medium"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="w-full text-sm font-medium text-amber-800 disabled:opacity-50"
            >
              {summaryLoading ? 'Generating celebration…' : '✨ Generate AI win summary'}
            </button>
          )}
        </div>
      )}

      {!loading && tab === 'activity' && <ActivityFeed activities={activities} />}
      {!loading && tab === 'wins' && <WinWall wins={wins} />}
    </div>
  )
}
```

---

## Task 5: GitHub/Vercel fetch library + tests

### 5.1 Create `lib/github.ts`

```typescript
// lib/github.ts
// Pure fetch functions and parsers for GitHub REST API v3 and Vercel API v13.
// Network calls are isolated to fetchGitHubData / fetchVercelData so that
// parsers can be unit-tested without mocking fetch.

export interface GitHubSyncResult {
  last_commit_message: string | null
  last_commit_author: string | null
  last_commit_at: string | null
  open_prs: number
}

export interface VercelSyncResult {
  deploy_status: 'ready' | 'building' | 'error' | null
  deploy_url: string | null
}

// ── Parsers (pure, testable) ──────────────────────────────────────────────────

export function parseGitHubCommitResponse(data: unknown): Omit<GitHubSyncResult, 'open_prs'> {
  const commits = Array.isArray(data) ? data : []
  const commit = commits[0] ?? null
  if (!commit) {
    return { last_commit_message: null, last_commit_author: null, last_commit_at: null }
  }
  return {
    last_commit_message: (commit as any).commit?.message?.split('\n')[0] ?? null,
    last_commit_author: (commit as any).commit?.author?.name ?? null,
    last_commit_at: (commit as any).commit?.author?.date ?? null,
  }
}

export function parseGitHubPRResponse(data: unknown): number {
  return Array.isArray(data) ? data.length : 0
}

export function parseVercelDeployResponse(data: unknown): VercelSyncResult {
  const deployment = (data as any)?.deployments?.[0]
  if (!deployment) return { deploy_status: null, deploy_url: null }

  const statusMap: Record<string, 'ready' | 'building' | 'error'> = {
    READY: 'ready',
    BUILDING: 'building',
    ERROR: 'error',
    CANCELED: 'error',
  }

  return {
    deploy_status: statusMap[deployment.state] ?? null,
    deploy_url: deployment.url ? `https://${deployment.url}` : null,
  }
}

// ── Network calls ─────────────────────────────────────────────────────────────

export async function fetchGitHubData(repo: string, token: string): Promise<GitHubSyncResult> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'sd-vet-mission-control/1.0',
  }

  const [commitsRes, prsRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { headers }),
    fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=100`, { headers }),
  ])

  const [commitsData, prsData] = await Promise.all([
    commitsRes.ok ? commitsRes.json() : [],
    prsRes.ok ? prsRes.json() : [],
  ])

  return {
    ...parseGitHubCommitResponse(commitsData),
    open_prs: parseGitHubPRResponse(prsData),
  }
}

export async function fetchVercelData(
  vercelProjectId: string,
  token: string,
  teamId?: string,
): Promise<VercelSyncResult> {
  const teamParam = teamId ? `&teamId=${teamId}` : ''
  const url = `https://api.vercel.com/v6/deployments?projectId=${vercelProjectId}&limit=1${teamParam}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return { deploy_status: null, deploy_url: null }

  const data = await res.json()
  return parseVercelDeployResponse(data)
}
```

### 5.2 Create `lib/__tests__/github.test.ts`

```typescript
// lib/__tests__/github.test.ts
import { describe, it, expect } from 'vitest'
import {
  parseGitHubCommitResponse,
  parseGitHubPRResponse,
  parseVercelDeployResponse,
} from '../github'

// ── parseGitHubCommitResponse ────────────────────────────────────────────────

describe('parseGitHubCommitResponse', () => {
  it('extracts commit details from GitHub commits array', () => {
    const data = [
      {
        sha: 'abc123',
        commit: {
          message: 'feat: add Stripe integration\n\nBreaking change blah',
          author: {
            name: 'Shaan Mocke',
            date: '2026-04-01T10:00:00Z',
          },
        },
      },
    ]
    const result = parseGitHubCommitResponse(data)
    expect(result.last_commit_message).toBe('feat: add Stripe integration')
    expect(result.last_commit_author).toBe('Shaan Mocke')
    expect(result.last_commit_at).toBe('2026-04-01T10:00:00Z')
  })

  it('takes only the first line of a multi-line commit message', () => {
    const data = [
      {
        commit: {
          message: 'fix: patch bug\n\nLong description here\nAnother line',
          author: { name: 'Deb', date: '2026-04-02T00:00:00Z' },
        },
      },
    ]
    expect(parseGitHubCommitResponse(data).last_commit_message).toBe('fix: patch bug')
  })

  it('returns nulls for empty array', () => {
    const result = parseGitHubCommitResponse([])
    expect(result.last_commit_message).toBeNull()
    expect(result.last_commit_author).toBeNull()
    expect(result.last_commit_at).toBeNull()
  })

  it('handles non-array input gracefully', () => {
    const result = parseGitHubCommitResponse(null)
    expect(result.last_commit_message).toBeNull()
  })

  it('handles missing nested fields', () => {
    const result = parseGitHubCommitResponse([{ commit: {} }])
    expect(result.last_commit_message).toBeNull()
    expect(result.last_commit_author).toBeNull()
    expect(result.last_commit_at).toBeNull()
  })
})

// ── parseGitHubPRResponse ────────────────────────────────────────────────────

describe('parseGitHubPRResponse', () => {
  it('counts open PRs', () => {
    const prs = [{ id: 1 }, { id: 2 }, { id: 3 }]
    expect(parseGitHubPRResponse(prs)).toBe(3)
  })

  it('returns 0 for empty array', () => {
    expect(parseGitHubPRResponse([])).toBe(0)
  })

  it('returns 0 for non-array', () => {
    expect(parseGitHubPRResponse(null)).toBe(0)
    expect(parseGitHubPRResponse({ total: 3 })).toBe(0)
  })
})

// ── parseVercelDeployResponse ────────────────────────────────────────────────

describe('parseVercelDeployResponse', () => {
  it('maps READY to ready', () => {
    const data = {
      deployments: [{ state: 'READY', url: 'vetrehab-abc123.vercel.app' }],
    }
    const result = parseVercelDeployResponse(data)
    expect(result.deploy_status).toBe('ready')
    expect(result.deploy_url).toBe('https://vetrehab-abc123.vercel.app')
  })

  it('maps BUILDING to building', () => {
    const data = {
      deployments: [{ state: 'BUILDING', url: 'vetrehab-xyz.vercel.app' }],
    }
    expect(parseVercelDeployResponse(data).deploy_status).toBe('building')
  })

  it('maps ERROR to error', () => {
    const data = {
      deployments: [{ state: 'ERROR', url: 'vetrehab-xyz.vercel.app' }],
    }
    expect(parseVercelDeployResponse(data).deploy_status).toBe('error')
  })

  it('maps CANCELED to error', () => {
    const data = {
      deployments: [{ state: 'CANCELED', url: 'vetrehab-xyz.vercel.app' }],
    }
    expect(parseVercelDeployResponse(data).deploy_status).toBe('error')
  })

  it('returns null status for unknown state', () => {
    const data = {
      deployments: [{ state: 'QUEUED', url: 'vetrehab.vercel.app' }],
    }
    expect(parseVercelDeployResponse(data).deploy_status).toBeNull()
  })

  it('returns nulls when deployments array is empty', () => {
    const result = parseVercelDeployResponse({ deployments: [] })
    expect(result.deploy_status).toBeNull()
    expect(result.deploy_url).toBeNull()
  })

  it('returns nulls for null/undefined input', () => {
    expect(parseVercelDeployResponse(null).deploy_status).toBeNull()
    expect(parseVercelDeployResponse(undefined).deploy_url).toBeNull()
  })

  it('prepends https:// to the URL', () => {
    const data = {
      deployments: [{ state: 'READY', url: 'my-app.vercel.app' }],
    }
    expect(parseVercelDeployResponse(data).deploy_url).toBe('https://my-app.vercel.app')
  })

  it('returns null deploy_url when url field is missing', () => {
    const data = { deployments: [{ state: 'READY' }] }
    expect(parseVercelDeployResponse(data).deploy_url).toBeNull()
  })
})
```

- [ ] **5.3** Run tests:

```bash
npx vitest run lib/__tests__/github.test.ts
```

Expected output:
```
 ✓ lib/__tests__/github.test.ts (14 tests) 10ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
```

---

## Task 6: GitHub sync cron route + vercel.json

### 6.1 Create `app/api/cron/sync-github/route.ts`

```typescript
// app/api/cron/sync-github/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchGitHubData, fetchVercelData } from '@/lib/github'

// Vercel cron calls this endpoint with the Authorization header set to
// `Bearer ${CRON_SECRET}`. We validate it to prevent public access.
function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const githubToken = process.env.GITHUB_TOKEN
  const vercelToken = process.env.VERCEL_API_TOKEN
  const vercelTeamId = process.env.VERCEL_TEAM_ID

  if (!githubToken || !vercelToken) {
    return NextResponse.json({ error: 'Missing GITHUB_TOKEN or VERCEL_API_TOKEN' }, { status: 500 })
  }

  const supabase = await createClient()

  // Fetch all projects that have a github_repo configured
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, github_repo, vercel_project_id')
    .not('github_repo', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const project of projects ?? []) {
    try {
      const [githubData, vercelData] = await Promise.all([
        fetchGitHubData(project.github_repo!, githubToken),
        project.vercel_project_id
          ? fetchVercelData(project.vercel_project_id, vercelToken, vercelTeamId)
          : Promise.resolve({ deploy_status: null, deploy_url: null }),
      ])

      const { error: upsertError } = await supabase
        .from('github_cache')
        .upsert(
          {
            project_id: project.id,
            last_commit_message: githubData.last_commit_message,
            last_commit_author: githubData.last_commit_author,
            last_commit_at: githubData.last_commit_at,
            open_prs: githubData.open_prs,
            deploy_status: vercelData.deploy_status,
            deploy_url: vercelData.deploy_url,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'project_id' },
        )

      if (upsertError) throw new Error(upsertError.message)
      results.push({ id: project.id, ok: true })
    } catch (err) {
      results.push({ id: project.id, ok: false, error: String(err) })
    }
  }

  const failed = results.filter(r => !r.ok)
  return NextResponse.json({
    synced: results.length,
    failed: failed.length,
    results,
  })
}
```

### 6.2 Create `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-github",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/slack-digest",
      "schedule": "0 22 * * *"
    }
  ]
}
```

> Note on the Slack digest schedule: Vercel crons run in UTC. 22:00 UTC = 08:00 AEST (UTC+10). Adjust to `0 21 * * *` (07:00 AEST) during daylight saving time (October–April) or `0 22 * * *` (08:00 AEST) April–October.

- [ ] **6.3** Verify `vercel.json` is in the project root:

```bash
ls vercel.json
```

Expected: `vercel.json`

---

## Task 7: Wire AutoStatus to project detail page

The `AutoStatus` component already exists at `components/project-detail/AutoStatus.tsx` and the `getGithubCache` query already exists. We just need to import the component and pass the cached data.

In `app/projects/[id]/page.tsx`:

**Step 7.1** — Add the import at the top:

```typescript
import AutoStatus from '@/components/project-detail/AutoStatus'
```

**Step 7.2** — Add `githubCache` to the `Promise.all` destructure. Find the existing line:

```typescript
  const [project, tasks, notes, links, analysis, projectExpenses, projectRevenue] = await Promise.all([
    getProject(id).catch(() => null),
    getProjectTasks(id),
    getProjectNotes(id),
    getProjectLinks(id),
    getProjectAnalysis(id),
    getExpenses(id),
    getRevenueEntries(id),
  ])
```

Replace with:

```typescript
  const [project, tasks, notes, links, analysis, projectExpenses, projectRevenue, githubCache] = await Promise.all([
    getProject(id).catch(() => null),
    getProjectTasks(id),
    getProjectNotes(id),
    getProjectLinks(id),
    getProjectAnalysis(id),
    getExpenses(id),
    getRevenueEntries(id),
    getGithubCache(id),
  ])
```

**Step 7.3** — Add `AutoStatus` just below the Summary section. Find:

```tsx
      {/* Summary */}
      {project.summary && <p className="text-gray-600 text-sm">{project.summary}</p>}

      {/* Next Step */}
```

Replace with:

```tsx
      {/* Summary */}
      {project.summary && <p className="text-gray-600 text-sm">{project.summary}</p>}

      {/* GitHub / Vercel auto status */}
      <AutoStatus cache={githubCache} />

      {/* Next Step */}
```

---

## Task 8: Slack message library + tests

### 8.1 Create `lib/slack.ts`

```typescript
// lib/slack.ts
// Pure message builder functions — no network calls, fully testable.

export function buildStatusMessage(
  projects: Array<{ name: string; emoji: string | null; stage: string; revenue_score: string }>,
  revenueTotal: number,
): string {
  const projectLines = projects
    .slice(0, 5)
    .map(p => `• ${p.emoji ?? ''} *${p.name}* — ${p.stage} (${p.revenue_score} revenue)`)
    .join('\n')
  return `*SD VetStudio Status* 📊\n\n*Active Projects:*\n${projectLines}\n\n*Revenue this month:* $${revenueTotal.toFixed(2)}`
}

export function buildWinsMessage(
  wins: Array<{ description: string | null; created_at: string }>,
): string {
  if (wins.length === 0) {
    return `*Win Wall* 🏆\n\nNo wins logged yet this week. Get out there! 💪`
  }
  const lines = wins
    .slice(0, 10)
    .map(w => `• ${w.description ?? 'Win logged'}`)
    .join('\n')
  return `*Win Wall* 🏆\n\n${lines}`
}

export function buildDigestMessage(args: {
  projectCount: number
  revenueThisMonth: number
  winsThisWeek: number
  topProject: string | null
}): string {
  return (
    `*Good morning, SD VetStudio! ☀️*\n\n` +
    `*Today's snapshot:*\n` +
    `• ${args.projectCount} active projects\n` +
    `• $${args.revenueThisMonth.toFixed(2)} revenue this month\n` +
    `• ${args.winsThisWeek} wins this week` +
    (args.topProject ? `\n\n*Top priority:* ${args.topProject}` : '')
  )
}

// ── Slack API helpers ─────────────────────────────────────────────────────────

export async function postSlackMessage(text: string, channel: string, token: string): Promise<void> {
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ channel, text }),
  })

  if (!res.ok) {
    throw new Error(`Slack API error: HTTP ${res.status}`)
  }

  const json = await res.json()
  if (!json.ok) {
    throw new Error(`Slack API error: ${json.error}`)
  }
}

export async function sendSlackResponse(responseUrl: string, text: string): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, response_type: 'in_channel' }),
  })
}
```

### 8.2 Create `lib/__tests__/slack.test.ts`

```typescript
// lib/__tests__/slack.test.ts
import { describe, it, expect } from 'vitest'
import { buildStatusMessage, buildWinsMessage, buildDigestMessage } from '../slack'

// ── buildStatusMessage ────────────────────────────────────────────────────────

describe('buildStatusMessage', () => {
  const projects = [
    { name: 'VetRehab', emoji: '🐾', stage: 'building', revenue_score: 'high' },
    { name: 'VetContent', emoji: '📸', stage: 'live', revenue_score: 'medium' },
  ]

  it('includes project names and stages', () => {
    const msg = buildStatusMessage(projects, 1200)
    expect(msg).toContain('*VetRehab*')
    expect(msg).toContain('building')
    expect(msg).toContain('*VetContent*')
    expect(msg).toContain('live')
  })

  it('includes revenue total formatted to 2 decimal places', () => {
    const msg = buildStatusMessage(projects, 1234.5)
    expect(msg).toContain('$1234.50')
  })

  it('limits to 5 projects', () => {
    const manyProjects = Array.from({ length: 8 }, (_, i) => ({
      name: `Project ${i}`,
      emoji: null,
      stage: 'building',
      revenue_score: 'low',
    }))
    const msg = buildStatusMessage(manyProjects, 0)
    // Each project line starts with "•", count them
    const bulletCount = (msg.match(/^•/gm) ?? []).length
    expect(bulletCount).toBeLessThanOrEqual(5)
  })

  it('handles null emoji gracefully', () => {
    const msg = buildStatusMessage(
      [{ name: 'NoEmoji', emoji: null, stage: 'inbox', revenue_score: 'low' }],
      0,
    )
    expect(msg).toContain('*NoEmoji*')
  })

  it('starts with SD VetStudio Status header', () => {
    const msg = buildStatusMessage(projects, 0)
    expect(msg).toMatch(/^\*SD VetStudio Status\*/)
  })
})

// ── buildWinsMessage ──────────────────────────────────────────────────────────

describe('buildWinsMessage', () => {
  it('lists wins as bullet points', () => {
    const wins = [
      { description: 'First beta signup', created_at: '2026-04-01T00:00:00Z' },
      { description: 'Revenue hit $1k', created_at: '2026-04-02T00:00:00Z' },
    ]
    const msg = buildWinsMessage(wins)
    expect(msg).toContain('• First beta signup')
    expect(msg).toContain('• Revenue hit $1k')
  })

  it('shows empty state message when no wins', () => {
    const msg = buildWinsMessage([])
    expect(msg).toContain('No wins logged yet')
  })

  it('limits to 10 wins', () => {
    const wins = Array.from({ length: 15 }, (_, i) => ({
      description: `Win ${i}`,
      created_at: '2026-04-01T00:00:00Z',
    }))
    const msg = buildWinsMessage(wins)
    const bulletCount = (msg.match(/^•/gm) ?? []).length
    expect(bulletCount).toBeLessThanOrEqual(10)
  })

  it('falls back to "Win logged" for null description', () => {
    const wins = [{ description: null, created_at: '2026-04-01T00:00:00Z' }]
    const msg = buildWinsMessage(wins)
    expect(msg).toContain('• Win logged')
  })

  it('includes Win Wall header', () => {
    const msg = buildWinsMessage([{ description: 'A win', created_at: '2026-04-01T00:00:00Z' }])
    expect(msg).toContain('*Win Wall*')
  })
})

// ── buildDigestMessage ────────────────────────────────────────────────────────

describe('buildDigestMessage', () => {
  it('includes all snapshot stats', () => {
    const msg = buildDigestMessage({
      projectCount: 4,
      revenueThisMonth: 850.75,
      winsThisWeek: 3,
      topProject: 'VetRehab',
    })
    expect(msg).toContain('4 active projects')
    expect(msg).toContain('$850.75 revenue this month')
    expect(msg).toContain('3 wins this week')
  })

  it('includes top project when provided', () => {
    const msg = buildDigestMessage({
      projectCount: 2,
      revenueThisMonth: 500,
      winsThisWeek: 1,
      topProject: 'VetRehab App',
    })
    expect(msg).toContain('*Top priority:* VetRehab App')
  })

  it('omits top priority section when topProject is null', () => {
    const msg = buildDigestMessage({
      projectCount: 2,
      revenueThisMonth: 500,
      winsThisWeek: 0,
      topProject: null,
    })
    expect(msg).not.toContain('Top priority')
  })

  it('formats revenue to 2 decimal places', () => {
    const msg = buildDigestMessage({
      projectCount: 1,
      revenueThisMonth: 1000,
      winsThisWeek: 0,
      topProject: null,
    })
    expect(msg).toContain('$1000.00')
  })

  it('starts with morning greeting', () => {
    const msg = buildDigestMessage({
      projectCount: 0,
      revenueThisMonth: 0,
      winsThisWeek: 0,
      topProject: null,
    })
    expect(msg).toMatch(/^\*Good morning/)
  })
})
```

- [ ] **8.3** Run tests:

```bash
npx vitest run lib/__tests__/slack.test.ts
```

Expected output:
```
 ✓ lib/__tests__/slack.test.ts (15 tests) 11ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

---

## Task 9: Slack slash command handler

### Slack App Prerequisites (manual steps before this task)

Before this route works end-to-end, you need to create a Slack app:

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name: `SD VetStudio Mission Control`, Workspace: your workspace
3. Under **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, add: `chat:write`, `commands`
4. Under **Slash Commands** → **Create New Command**:
   - Command: `/mc`
   - Request URL: `https://your-domain.vercel.app/api/slack/commands`
   - Short Description: `Mission Control status`
   - Usage Hint: `status | wins`
5. **Install to Workspace** and copy **Bot User OAuth Token** (`xoxb-...`) → `SLACK_BOT_TOKEN`
6. Under **Basic Information** → **App Credentials** → copy **Signing Secret** → `SLACK_SIGNING_SECRET`
7. Create a `#mission-control` channel in Slack and copy its Channel ID → `SLACK_CHANNEL_ID`

### 9.1 Create `app/api/slack/commands/route.ts`

```typescript
// app/api/slack/commands/route.ts
// Handles Slack slash commands: /mc status, /mc wins
// Verifies Slack request signature before processing.
import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { buildStatusMessage, buildWinsMessage, sendSlackResponse } from '@/lib/slack'

// ── Signature verification ────────────────────────────────────────────────────

async function verifySlackSignature(req: Request): Promise<boolean> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) return false

  const timestamp = req.headers.get('x-slack-request-timestamp') ?? ''
  const signature = req.headers.get('x-slack-signature') ?? ''

  // Reject requests older than 5 minutes to prevent replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
  if (parseInt(timestamp, 10) < fiveMinutesAgo) return false

  const body = await req.text()
  const baseString = `v0:${timestamp}:${body}`
  const hash = `v0=` + createHmac('sha256', signingSecret).update(baseString).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  } catch {
    return false
  }
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function handleStatus(responseUrl: string) {
  const supabase = await createClient()

  const [{ data: projects }, { data: revenues }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, emoji, stage, revenue_score')
      .neq('stage', 'archived')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('revenue_entries')
      .select('amount')
      .gte('revenue_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
  ])

  const revenueTotal = (revenues ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const text = buildStatusMessage(projects ?? [], revenueTotal)
  await sendSlackResponse(responseUrl, text)
}

async function handleWins(responseUrl: string) {
  const supabase = await createClient()

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data: wins } = await supabase
    .from('activity_log')
    .select('description, created_at')
    .eq('is_win', true)
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  const text = buildWinsMessage(wins ?? [])
  await sendSlackResponse(responseUrl, text)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Clone request for body reading (signature verification reads the body once)
  const clonedReq = req.clone()
  const isValid = await verifySlackSignature(clonedReq)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = await req.text()
  const params = new URLSearchParams(body)
  const text = (params.get('text') ?? '').trim().toLowerCase()
  const responseUrl = params.get('response_url') ?? ''

  // Acknowledge immediately (Slack requires response within 3 seconds)
  // Then process asynchronously via response_url
  const subcommand = text.split(/\s+/)[0]

  switch (subcommand) {
    case 'status':
      handleStatus(responseUrl).catch(console.error)
      return NextResponse.json({ text: 'Fetching status…', response_type: 'in_channel' })

    case 'wins':
      handleWins(responseUrl).catch(console.error)
      return NextResponse.json({ text: 'Fetching wins…', response_type: 'in_channel' })

    default:
      return NextResponse.json({
        text: 'Usage: `/mc status` — project snapshot | `/mc wins` — this week\'s wins',
        response_type: 'ephemeral',
      })
  }
}
```

---

## Task 10: Slack daily digest cron

### 10.1 Create `app/api/cron/slack-digest/route.ts`

```typescript
// app/api/cron/slack-digest/route.ts
// Called by Vercel cron at 22:00 UTC (08:00 AEST) daily.
// Posts a morning digest to the configured Slack channel.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildDigestMessage, postSlackMessage } from '@/lib/slack'

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slackToken = process.env.SLACK_BOT_TOKEN
  const channelId = process.env.SLACK_CHANNEL_ID

  if (!slackToken || !channelId) {
    return NextResponse.json(
      { error: 'Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID' },
      { status: 500 },
    )
  }

  const supabase = await createClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: projects },
    { data: revenues },
    { data: wins },
    { data: topTask },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id')
      .neq('stage', 'archived'),
    supabase
      .from('revenue_entries')
      .select('amount')
      .gte('revenue_date', monthStart),
    supabase
      .from('activity_log')
      .select('id')
      .eq('is_win', true)
      .gte('created_at', weekStart),
    supabase
      .from('tasks')
      .select('title, projects(name)')
      .eq('is_next_step', true)
      .eq('completed', false)
      .limit(1)
      .single(),
  ])

  const revenueThisMonth = (revenues ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

  let topProject: string | null = null
  if (topTask) {
    const task = topTask as any
    const projectName = task.projects?.name ?? null
    topProject = projectName ? `${task.title} (${projectName})` : task.title
  }

  const text = buildDigestMessage({
    projectCount: (projects ?? []).length,
    revenueThisMonth,
    winsThisWeek: (wins ?? []).length,
    topProject,
  })

  await postSlackMessage(text, channelId, slackToken)

  return NextResponse.json({ ok: true, message: 'Digest sent' })
}
```

---

## Task 11: Settings page — integration status display

Replace `app/settings/page.tsx` with the version below. It shows live connection status for Slack and GitHub/Vercel by checking whether the env vars are set (server-side, never exposed to the client):

```typescript
// app/settings/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
        connected
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
      {connected ? 'Connected' : 'Not configured'}
    </span>
  )
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Check env vars server-side — booleans only, never exposed to client
  const slackConnected = Boolean(
    process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID,
  )
  const githubConnected = Boolean(process.env.GITHUB_TOKEN)
  const vercelConnected = Boolean(process.env.VERCEL_API_TOKEN)
  const aiConnected = Boolean(process.env.ANTHROPIC_API_KEY)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Profile</h2>
        <div className="text-sm text-gray-600">
          <div className="mb-1">
            <span className="text-gray-400">Name:</span> {profile?.name ?? '—'}
          </div>
          <div className="mb-1">
            <span className="text-gray-400">Email:</span> {user.email}
          </div>
          <div>
            <span className="text-gray-400">Role:</span> {profile?.role ?? '—'}
          </div>
        </div>
      </div>

      {/* AI */}
      <div className="bg-white rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-700">Claude AI</h2>
          <StatusBadge connected={aiConnected} />
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Powers next-step suggestions, win summaries, and energy tagging.
        </p>
        {!aiConnected && (
          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">To connect:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Get an API key from <span className="font-mono">console.anthropic.com</span></li>
              <li>Add <span className="font-mono">ANTHROPIC_API_KEY=sk-ant-...</span> to <span className="font-mono">.env.local</span></li>
              <li>Redeploy to Vercel with the key set in project env vars</li>
            </ol>
          </div>
        )}
      </div>

      {/* GitHub / Vercel */}
      <div className="bg-white rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-700">GitHub / Vercel</h2>
          <div className="flex gap-1.5">
            <StatusBadge connected={githubConnected} />
            <StatusBadge connected={vercelConnected} />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Syncs deploy status and last commit hourly via Vercel cron.
        </p>
        {(!githubConnected || !vercelConnected) && (
          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">To connect:</p>
            <ol className="list-decimal list-inside space-y-1">
              {!githubConnected && (
                <li>
                  Generate a GitHub personal access token (repo: read) at{' '}
                  <span className="font-mono">github.com/settings/tokens</span> → set{' '}
                  <span className="font-mono">GITHUB_TOKEN</span>
                </li>
              )}
              {!vercelConnected && (
                <li>
                  Create a Vercel API token at{' '}
                  <span className="font-mono">vercel.com/account/tokens</span> → set{' '}
                  <span className="font-mono">VERCEL_API_TOKEN</span>
                </li>
              )}
              <li>
                Set <span className="font-mono">CRON_SECRET</span> to any random string
                (used to authenticate cron calls)
              </li>
              <li>Redeploy — the cron will start syncing hourly</li>
            </ol>
          </div>
        )}
      </div>

      {/* Slack */}
      <div className="bg-white rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-gray-700">Slack</h2>
          <StatusBadge connected={slackConnected} />
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Slash commands (<span className="font-mono">/mc status</span>,{' '}
          <span className="font-mono">/mc wins</span>) and daily 8am digest.
        </p>
        {!slackConnected && (
          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800">
            <p className="font-medium mb-1">To connect:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a Slack app at <span className="font-mono">api.slack.com/apps</span></li>
              <li>Add bot scopes: <span className="font-mono">chat:write</span>, <span className="font-mono">commands</span></li>
              <li>
                Create slash command <span className="font-mono">/mc</span> pointing to{' '}
                <span className="font-mono">https://your-domain.vercel.app/api/slack/commands</span>
              </li>
              <li>Install to workspace and copy Bot Token → <span className="font-mono">SLACK_BOT_TOKEN</span></li>
              <li>Copy Signing Secret → <span className="font-mono">SLACK_SIGNING_SECRET</span></li>
              <li>Copy your channel ID → <span className="font-mono">SLACK_CHANNEL_ID</span></li>
            </ol>
          </div>
        )}
        {slackConnected && (
          <p className="text-xs text-gray-400">
            Daily digest posts at 8:00am AEST. Try{' '}
            <span className="font-mono">/mc status</span> in Slack.
          </p>
        )}
      </div>

      {/* Sign out */}
      <form action="/api/auth/signout" method="POST">
        <button
          type="submit"
          className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium text-sm"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
```

---

## Task 12: Phase 5 smoke test

Run all tests together to confirm no regressions:

- [ ] **12.1** Run the full test suite:

```bash
npx vitest run
```

Expected output:
```
 ✓ lib/__tests__/finance.test.ts (10 tests) 12ms
 ✓ lib/__tests__/revenue.test.ts (6 tests) 8ms
 ✓ lib/__tests__/ai.test.ts (16 tests) 10ms
 ✓ lib/__tests__/github.test.ts (14 tests) 9ms
 ✓ lib/__tests__/slack.test.ts (15 tests) 11ms

 Test Files  5 passed (5)
      Tests  61 passed (61)
   Start at  08:xx:xx
   Duration  xxx ms
```

- [ ] **12.2** TypeScript check across all new files:

```bash
npx tsc --noEmit
```

Expected output: no errors.

- [ ] **12.3** Start the dev server and manually test each subsystem:

```bash
npm run dev
```

**Subsystem A — AI routes:**
```bash
# In a separate terminal, test next-step endpoint (replace cookie with your session cookie)
curl -s -X POST http://localhost:3000/api/ai/next-step \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"project":{"name":"VetRehab","stage":"building","summary":"Rehab tracking","revenue_score":"high"},"tasks":[{"title":"Add Stripe","completed":false}]}'
```

Expected response:
```json
{"task":"Add Stripe checkout to beta users","energy":"high","why":"Unlocks first paying customers and validates pricing."}
```

```bash
# Test win summary endpoint
curl -s -X POST http://localhost:3000/api/ai/win-summary \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"wins":[{"description":"First beta signup","created_at":"2026-04-01T00:00:00Z"}]}'
```

Expected response:
```json
{"summary":"You two landed your first beta signup — that's real validation that VetStudio is solving a problem vets care about. Keep that momentum going."}
```

```bash
# Test energy tagger
curl -s -X POST http://localhost:3000/api/ai/tag-energy \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{"title":"Write landing page copy"}'
```

Expected response:
```json
{"energy":"medium"}
```

**Subsystem B — GitHub sync:**
```bash
# Test cron endpoint (requires CRON_SECRET set in .env.local)
curl -s http://localhost:3000/api/cron/sync-github \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{"synced":2,"failed":0,"results":[{"id":"...","ok":true},{"id":"...","ok":true}]}
```

- Check that `github_cache` rows are updated in Supabase Table Editor
- Navigate to a project detail page with a `github_repo` set — the `AutoStatus` bar should show last commit info

**Subsystem C — Slack:**
- In Slack, type `/mc status` → should respond with active projects and revenue
- Type `/mc wins` → should respond with recent wins
- Type `/mc help` → should respond with usage hint
- Check Settings page shows Slack `Connected` badge

- [ ] **12.4** Deploy to Vercel and confirm crons appear:

```bash
vercel deploy --prod
```

Then in Vercel dashboard → Project → Settings → Crons, verify:
- `/api/cron/sync-github` — schedule: `0 * * * *` (hourly)
- `/api/cron/slack-digest` — schedule: `0 22 * * *` (08:00 AEST)

---

## Subsystem dependency map

```
Phase 5A (AI)           Phase 5B (GitHub/Vercel)    Phase 5C (Slack)
─────────────           ────────────────────────    ────────────────
lib/ai.ts               lib/github.ts               lib/slack.ts
app/api/ai/*            app/api/cron/sync-github    app/api/slack/commands
AIAnalysisPanel.tsx     vercel.json                 app/api/cron/slack-digest
app/log/page.tsx        app/projects/[id]/page.tsx  app/settings/page.tsx
                        app/settings/page.tsx
```

Each subsystem is independent. You can ship 5A without 5B or 5C. The `vercel.json` crons for 5C will silently no-op if `SLACK_BOT_TOKEN` is not set (the route returns 500 but Vercel cron does not alert by default).

---

## Environment variable checklist

| Var | Subsystem | Where to get it |
|-----|-----------|-----------------|
| `ANTHROPIC_API_KEY` | AI | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `GITHUB_TOKEN` | GitHub | [github.com/settings/tokens](https://github.com/settings/tokens) → Fine-grained or classic, `repo:read` scope |
| `VERCEL_API_TOKEN` | Vercel | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_TEAM_ID` | Vercel | Optional. Vercel dashboard → Team Settings → General → Team ID |
| `CRON_SECRET` | B + C | Any random string, e.g. `openssl rand -hex 32` |
| `SLACK_BOT_TOKEN` | Slack | Slack App → OAuth & Permissions → Bot User OAuth Token |
| `SLACK_SIGNING_SECRET` | Slack | Slack App → Basic Information → Signing Secret |
| `SLACK_CHANNEL_ID` | Slack | Right-click channel in Slack → Copy Link — ID is the last segment |
