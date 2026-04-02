# Revenue-First Dashboard — Phase 2: Core Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Home (Revenue Dashboard) screen, Projects list with GTD filtering, and Project Detail — the three most-used screens in the app.

**Architecture:** Server components for data fetching, client components for interactive UI. Supabase queries in `lib/queries/` files. `frontend-design` skill MUST be invoked when implementing the visual UI for Home and Project Detail to ensure production-grade design quality.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase, `@dnd-kit` (already installed for kanban), React, `frontend-design` skill for visual implementation

**Prerequisite:** Phase 1 complete — schema migrated, types defined, navigation shell in place.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/queries/projects.ts` | All Supabase queries for projects + tasks |
| Create | `lib/queries/revenue.ts` | Revenue entry + expense queries |
| Create | `components/home/RevenueTiles.tsx` | Three revenue stat tiles |
| Create | `components/home/MoneyMovesList.tsx` | Ranked task list with quick actions |
| Create | `components/home/WinStreak.tsx` | Weekly task completion counter |
| Create | `components/home/QuickAddModal.tsx` | Quick add idea modal |
| Modify | `app/page.tsx` | Full Home Revenue Dashboard |
| Create | `components/projects/ProjectCard.tsx` | Project card in list view |
| Create | `components/projects/StageFilterPills.tsx` | GTD filter pills |
| Create | `components/projects/NewProjectModal.tsx` | Create project modal |
| Modify | `app/projects/page.tsx` | Full projects list |
| Create | `components/project-detail/ProjectHeader.tsx` | Name, stage, revenue score, pin |
| Create | `components/project-detail/TaskList.tsx` | Full task list with inline add/edit |
| Create | `components/project-detail/NextStepCard.tsx` | Gold-highlighted next step |
| Create | `components/project-detail/ProjectLinks.tsx` | Key links grid |
| Create | `components/project-detail/ProjectFinanceMini.tsx` | Mini P&L for the project |
| Create | `components/project-detail/ProjectNotes.tsx` | Notes feed + add note |
| Create | `components/project-detail/AIAnalysisPanel.tsx` | Project Prioritizer analysis panel |
| Modify | `app/projects/[id]/page.tsx` | Full project detail page |

---

### Task 1: Supabase Query Layer

**Files:**
- Create: `lib/queries/projects.ts`
- Create: `lib/queries/revenue.ts`

- [ ] **Step 1: Write project queries**

```typescript
// lib/queries/projects.ts
import { createClient } from '@/lib/supabase'
import type { Project, Task, ProjectNote, ProjectLink, ProjectAnalysis, GithubCache } from '@/lib/types'

export async function getProjects() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .neq('stage', 'archived')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data as Project[]
}

export async function getProject(id: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Project
}

export async function getProjectTasks(projectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('is_next_step', { ascending: false })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data as Task[]
}

export async function getActiveTasksWithProjects(): Promise<Array<{ task: Task; project: Project }>> {
  const supabase = createClient()
  // Note: Supabase doesn't support .in() on joined table columns directly.
  // Fetch all non-completed tasks with their projects, then filter by stage in JS.
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(*)')
    .eq('completed', false)
    .not('project_id', 'is', null)
  if (error) throw error
  const activeStages = ['exploring', 'building', 'live', 'maintenance']
  return (data ?? [])
    .filter((row: any) => row.project && activeStages.includes(row.project.stage))
    .map((row: any) => ({ task: row as Task, project: row.project as Project }))
}

export async function createProject(values: {
  name: string
  summary?: string
  revenue_score: 'low' | 'medium' | 'high'
  revenue_stream?: string
  stage?: string
  emoji?: string
  created_by: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ emoji: '📁', stage: 'inbox', ...values })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function updateProject(id: string, values: Partial<Project>) {
  const supabase = createClient()
  const { error } = await supabase
    .from('projects')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function createTask(values: {
  project_id: string
  title: string
  assigned_to?: string | null
  is_shared?: boolean
  energy?: 'high' | 'medium' | 'low'
  created_by?: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert(values)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function completeTask(taskId: string, userId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ completed: true, completed_at: new Date().toISOString(), completed_by: userId })
    .eq('id', taskId)
  if (error) throw error
}

export async function setNextStep(projectId: string, taskId: string) {
  const supabase = createClient()
  // Clear existing next step
  await supabase
    .from('tasks')
    .update({ is_next_step: false })
    .eq('project_id', projectId)
  // Set new next step
  const { error } = await supabase
    .from('tasks')
    .update({ is_next_step: true })
    .eq('id', taskId)
  if (error) throw error
}

export async function getProjectLinks(projectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_links')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
  if (error) throw error
  return data as ProjectLink[]
}

export async function getProjectNotes(projectId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('project_notes')
    .select('*, author:profiles(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as (ProjectNote & { author: { name: string } | null })[]
}

export async function addProjectNote(projectId: string, content: string, authorId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_notes')
    .insert({ project_id: projectId, content, author_id: authorId, note_type: 'note' })
  if (error) throw error
}

export async function getProjectAnalysis(projectId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('project_analysis')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  return data as ProjectAnalysis | null
}

export async function saveProjectAnalysis(values: {
  project_id: string
  income_potential: string
  build_difficulty: string
  recommendation: string
  raw_output: string
  analysed_by: string
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('project_analysis')
    .upsert({ ...values, analysed_at: new Date().toISOString() }, { onConflict: 'project_id' })
  if (error) throw error
}

export async function getGithubCache(projectId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('github_cache')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  return data as GithubCache | null
}
```

- [ ] **Step 2: Write revenue queries**

```typescript
// lib/queries/revenue.ts
import { createClient } from '@/lib/supabase'
import type { RevenueEntry, Expense } from '@/lib/types'

export async function getRevenueEntries(projectId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('revenue_entries')
    .select('*')
    .order('revenue_date', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return data as RevenueEntry[]
}

export async function logRevenue(values: {
  description: string
  amount: number
  stream: string
  project_id?: string | null
  revenue_date?: string
  created_by: string
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('revenue_entries')
    .insert({ revenue_date: new Date().toISOString().split('T')[0], ...values })
  if (error) throw error
}

export async function getExpenses(projectId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('expenses')
    .select('*, project:projects(name, emoji)')
    .order('expense_date', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return data as (Expense & { project: { name: string; emoji: string } | null })[]
}

export async function logExpense(values: {
  description: string
  amount: number
  category: string
  project_id?: string | null
  paid_by: 'shaan' | 'deb' | 'split'
  expense_date?: string
  created_by: string
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .insert({ expense_date: new Date().toISOString().split('T')[0], ...values })
  if (error) throw error
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/queries/projects.ts lib/queries/revenue.ts
git commit -m "feat: Supabase query layer for projects, tasks, revenue, expenses"
```

---

### Task 2: Home Screen — Revenue Dashboard

**Files:**
- Create: `components/home/RevenueTiles.tsx`
- Create: `components/home/MoneyMovesList.tsx`
- Create: `components/home/WinStreak.tsx`
- Modify: `app/page.tsx`

> ⚠️ **INVOKE `frontend-design` SKILL** before implementing the visual components in this task. The skill will guide the visual design implementation to production quality.

- [ ] **Step 1: Write RevenueTiles component**

```tsx
// components/home/RevenueTiles.tsx
'use client'
import type { RevenueEntry } from '@/lib/types'
import { getRevenueTotal, filterCurrentMonth } from '@/lib/finance'

interface Props {
  entries: RevenueEntry[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount)
}

export default function RevenueTiles({ entries }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter(e => e.revenue_date === today)
  const monthEntries = filterCurrentMonth(entries, 'revenue_date')
  const inAppEntries = entries.filter(e => e.stream === 'inapp')
  const inAppMonth = filterCurrentMonth(inAppEntries, 'revenue_date')

  const tiles = [
    { label: 'Today', value: getRevenueTotal(todayEntries), accent: 'bg-teal-700' },
    { label: 'This Month', value: getRevenueTotal(monthEntries), accent: 'bg-amber-500' },
    { label: 'In-App / Tokens', value: getRevenueTotal(inAppMonth), accent: 'bg-teal-600' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {tiles.map(tile => (
        <div key={tile.label} className={`${tile.accent} rounded-xl p-3 text-white text-center`}>
          <div className="text-xs opacity-80 mb-1">{tile.label}</div>
          <div className="text-lg font-bold leading-tight">{formatCurrency(tile.value)}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write MoneyMovesList component**

```tsx
// components/home/MoneyMovesList.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MoneyMove } from '@/lib/types'
import { sortMoneyMoves } from '@/lib/revenue'

const REVENUE_EMOJI: Record<string, string> = { high: '💰💰💰', medium: '💰💰', low: '💰' }
const ENERGY_EMOJI: Record<string, string> = { high: '⚡', medium: '☕', low: '🛋️' }

interface Props {
  moves: MoneyMove[]
  onComplete: (taskId: string) => Promise<void>
}

export default function MoneyMovesList({ moves, onComplete }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const sorted = sortMoneyMoves(moves)

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">🎉</div>
        <div className="text-sm">All caught up! Add tasks to projects to see money moves here.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map(({ task, project }) => (
        <div key={task.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            className="w-full text-left px-4 py-3 flex items-start gap-3"
            onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate">{task.title}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span>{project.emoji} {project.name}</span>
                <span>{REVENUE_EMOJI[project.revenue_score]}</span>
                <span>{ENERGY_EMOJI[task.energy]}</span>
                {task.is_next_step && (
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium">NEXT</span>
                )}
              </div>
            </div>
          </button>
          {expandedId === task.id && (
            <div className="px-4 pb-3 flex gap-2 border-t border-gray-100 pt-2">
              <button
                disabled={completing === task.id}
                onClick={async () => {
                  setCompleting(task.id)
                  await onComplete(task.id)
                  setCompleting(null)
                  router.refresh()
                }}
                className="flex-1 bg-teal-700 text-white text-sm rounded-lg py-2 font-medium disabled:opacity-50"
              >
                {completing === task.id ? 'Saving…' : '✓ Done'}
              </button>
              <button
                onClick={() => setExpandedId(null)}
                className="flex-1 bg-gray-100 text-gray-600 text-sm rounded-lg py-2"
              >
                Skip
              </button>
              <button
                onClick={() => router.push(`/projects/${task.project_id}`)}
                className="flex-1 bg-gray-100 text-gray-600 text-sm rounded-lg py-2"
              >
                View →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write WinStreak component**

```tsx
// components/home/WinStreak.tsx
'use client'
import Link from 'next/link'

interface Props {
  completedThisWeek: number
}

export default function WinStreak({ completedThisWeek }: Props) {
  return (
    <Link href="/log" className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm">
      <span className="text-xl">🏆</span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-800">
          {completedThisWeek} task{completedThisWeek !== 1 ? 's' : ''} completed this week
        </div>
        <div className="text-xs text-gray-400">Tap to see your wins →</div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Assemble the Home page**

```tsx
// app/page.tsx
import { createClient } from '@/lib/supabase'
import { getActiveTasksWithProjects } from '@/lib/queries/projects'
import { getRevenueEntries } from '@/lib/queries/revenue'
import RevenueTiles from '@/components/home/RevenueTiles'
import MoneyMovesList from '@/components/home/MoneyMovesList'
import WinStreak from '@/components/home/WinStreak'
import { completeTask } from '@/lib/queries/projects'

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [movesData, revenueEntries] = await Promise.all([
    getActiveTasksWithProjects(),
    getRevenueEntries(),
  ])

  // Count tasks completed this week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const { count: weeklyWins } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)
    .gte('completed_at', weekStart.toISOString())

  async function handleComplete(taskId: string) {
    'use server'
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await completeTask(taskId, user.id)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-teal-700">SD VetStudio</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <RevenueTiles entries={revenueEntries} />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">💰 Your Money Moves</h2>
      </div>
      <div className="mb-4">
        <MoneyMovesList moves={movesData} onComplete={handleComplete} />
      </div>

      <div className="mb-6">
        <WinStreak completedThisWeek={weeklyWins ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <a href="/projects?new=1" className="bg-white rounded-xl p-3 text-center text-sm font-medium text-teal-700 shadow-sm">+ Add Idea</a>
        <a href="/projects" className="bg-white rounded-xl p-3 text-center text-sm font-medium text-gray-700 shadow-sm">All Projects</a>
        <a href="/finance?tab=revenue&new=1" className="bg-white rounded-xl p-3 text-center text-sm font-medium text-amber-600 shadow-sm">Log Revenue</a>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Test in browser**

```bash
npm run dev
```

Visit `/`. Revenue tiles should show $0 (no data yet). Money Moves should show empty state. WinStreak should show 0.

- [ ] **Step 6: Commit**

```bash
git add components/home/ app/page.tsx
git commit -m "feat: home revenue dashboard — revenue tiles, money moves list, win streak"
```

---

### Task 3: Projects List

**Files:**
- Create: `components/projects/ProjectCard.tsx`
- Create: `components/projects/StageFilterPills.tsx`
- Create: `components/projects/NewProjectModal.tsx`
- Modify: `app/projects/page.tsx`

- [ ] **Step 1: Write ProjectCard**

```tsx
// components/projects/ProjectCard.tsx
import Link from 'next/link'
import type { Project, Task } from '@/lib/types'

const REVENUE_EMOJI: Record<string, string> = { high: '💰💰💰', medium: '💰💰', low: '💰' }
const STAGE_COLORS: Record<string, string> = {
  inbox: 'bg-gray-100 text-gray-600',
  someday: 'bg-purple-100 text-purple-600',
  exploring: 'bg-blue-100 text-blue-700',
  building: 'bg-orange-100 text-orange-700',
  live: 'bg-green-100 text-green-700',
  maintenance: 'bg-teal-100 text-teal-700',
}

interface Props {
  project: Project
  nextStep?: Task | null
}

export default function ProjectCard({ project, nextStep }: Props) {
  return (
    <Link href={`/projects/${project.id}`} className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{project.emoji}</span>
          <span className="font-semibold text-gray-800 truncate">{project.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm">{REVENUE_EMOJI[project.revenue_score]}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[project.stage] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.stage}
          </span>
        </div>
      </div>
      {nextStep && (
        <div className="text-xs text-teal-700 font-medium truncate">
          → {nextStep.title}
        </div>
      )}
      {!nextStep && (
        <div className="text-xs text-gray-400">No next step set</div>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Write StageFilterPills**

```tsx
// components/projects/StageFilterPills.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ProjectStage } from '@/lib/types'

const STAGES: Array<{ value: ProjectStage | 'all'; label: string; icon: string }> = [
  { value: 'all', label: 'All', icon: '' },
  { value: 'inbox', label: 'Inbox', icon: '📥' },
  { value: 'someday', label: 'Someday', icon: '💤' },
  { value: 'exploring', label: 'Exploring', icon: '🔍' },
  { value: 'building', label: 'Building', icon: '🔨' },
  { value: 'live', label: 'Live', icon: '🟢' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
]

interface Props {
  counts: Record<string, number>
}

export default function StageFilterPills({ counts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('stage') ?? 'all'

  function setStage(stage: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (stage === 'all') params.delete('stage')
    else params.set('stage', stage)
    router.push(`/projects?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {STAGES.map(s => (
        <button
          key={s.value}
          onClick={() => setStage(s.value)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            active === s.value
              ? 'bg-teal-700 text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          {s.icon && <span>{s.icon}</span>}
          <span>{s.label}</span>
          {counts[s.value] !== undefined && counts[s.value] > 0 && (
            <span className={`text-xs ${active === s.value ? 'opacity-80' : 'text-gray-400'}`}>
              {counts[s.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write NewProjectModal**

```tsx
// components/projects/NewProjectModal.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RevenueScore, RevenueStream } from '@/lib/types'

interface Props {
  onClose: () => void
  onSubmit: (values: {
    name: string
    summary: string
    revenue_score: RevenueScore
    revenue_stream: RevenueStream | null
    stage: string
  }) => Promise<{ id: string }>
}

const REVENUE_STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course', label: '🎓 Course sales' },
  { value: 'subscription', label: '🔄 Subscription' },
  { value: 'inapp', label: '📱 In-app / tokens' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'sponsorship', label: '🤝 Sponsorship' },
  { value: 'affiliate', label: '🔗 Affiliate' },
  { value: 'other', label: '📦 Other' },
]

export default function NewProjectModal({ onClose, onSubmit }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [revenueScore, setRevenueScore] = useState<RevenueScore>('medium')
  const [revenueStream, setRevenueStream] = useState<RevenueStream | null>(null)
  const [stage, setStage] = useState('inbox')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    setSaving(true)
    setError('')
    try {
      const project = await onSubmit({ name: name.trim(), summary, revenue_score: revenueScore, revenue_stream: revenueStream, stage })
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setError('Failed to create project. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Project name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. VetScribe Pro tier"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">One-line description</label>
            <input
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Optional — what's this about?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Revenue potential</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as RevenueScore[]).map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRevenueScore(score)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    revenueScore === score
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {{ low: '💰', medium: '💰💰', high: '💰💰💰' }[score]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Revenue stream</label>
            <select
              value={revenueStream ?? ''}
              onChange={e => setRevenueStream((e.target.value as RevenueStream) || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select stream…</option>
              {REVENUE_STREAMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Stage</label>
            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="inbox">📥 Inbox</option>
              <option value="someday">💤 Someday/Maybe</option>
              <option value="exploring">🔍 Exploring</option>
              <option value="building">🔨 Building</option>
              <option value="live">🟢 Live</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Assemble Projects page**

```tsx
// app/projects/page.tsx
import { getProjects, getProjectTasks, createProject } from '@/lib/queries/projects'
import { createClient } from '@/lib/supabase'
import ProjectCard from '@/components/projects/ProjectCard'
import StageFilterPills from '@/components/projects/StageFilterPills'
import type { ProjectStage } from '@/lib/types'
// NewProjectModal is client-only — wrap in a client component
import ProjectsClientWrapper from '@/components/projects/ProjectsClientWrapper'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { stage?: string }
}) {
  const projects = await getProjects()
  const stage = searchParams.stage as ProjectStage | undefined

  // Fetch next step for each project
  const tasksPerProject = await Promise.all(
    projects.map(p => getProjectTasks(p.id))
  )
  const nextStepMap = Object.fromEntries(
    projects.map((p, i) => [p.id, tasksPerProject[i].find(t => t.is_next_step) ?? null])
  )

  const filtered = stage ? projects.filter(p => p.stage === stage) : projects

  const counts: Record<string, number> = { all: projects.length }
  for (const p of projects) {
    counts[p.stage] = (counts[p.stage] ?? 0) + 1
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">📂 Projects <span className="text-gray-400 font-normal text-base">({projects.length})</span></h1>
        <ProjectsClientWrapper />
      </div>
      <div className="mb-4">
        <StageFilterPills counts={counts} />
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map(project => (
          <ProjectCard key={project.id} project={project} nextStep={nextStepMap[project.id]} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">No projects in this stage.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create ProjectsClientWrapper (handles "+ New" button + modal)**

```tsx
// components/projects/ProjectsClientWrapper.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NewProjectModal from './NewProjectModal'

export default function ProjectsClientWrapper() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleCreate(values: Parameters<typeof import('./NewProjectModal').default>[0]['onSubmit'][0]>) {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    if (!res.ok) throw new Error('Failed to create')
    return res.json()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
      >
        + New
      </button>
      {open && (
        <NewProjectModal
          onClose={() => setOpen(false)}
          onSubmit={async (values) => {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            if (!res.ok) throw new Error('Failed')
            const project = await res.json()
            setOpen(false)
            return project
          }}
        />
      )}
    </>
  )
}
```

- [ ] **Step 6: Create API route for project creation**

```typescript
// app/api/projects/route.ts
import { createClient } from '@/lib/supabase'
import { createProject } from '@/lib/queries/projects'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const project = await createProject({ ...body, created_by: user.id })
  return NextResponse.json(project)
}
```

- [ ] **Step 7: Commit**

```bash
git add components/projects/ app/projects/page.tsx app/api/projects/
git commit -m "feat: projects list with GTD filter pills, project cards, new project modal"
```

---

### Task 4: Project Detail

**Files:**
- Create: `components/project-detail/ProjectHeader.tsx`
- Create: `components/project-detail/TaskList.tsx`
- Create: `components/project-detail/NextStepCard.tsx`
- Create: `components/project-detail/AIAnalysisPanel.tsx`
- Modify: `app/projects/[id]/page.tsx`

> ⚠️ **INVOKE `frontend-design` SKILL** before implementing the visual components in this task.

- [ ] **Step 1: Write NextStepCard**

```tsx
// components/project-detail/NextStepCard.tsx
import type { Task } from '@/lib/types'

const ENERGY_LABEL: Record<string, string> = { high: '⚡ High energy', medium: '☕ Medium', low: '🛋️ Low energy' }

interface Props {
  task: Task | null
  assigneeName?: string
}

export default function NextStepCard({ task, assigneeName }: Props) {
  if (!task) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-600">
        No next step set — tap a task below and mark it as next step.
      </div>
    )
  }
  return (
    <div className="bg-amber-500 rounded-xl p-4 text-white">
      <div className="text-xs font-semibold opacity-80 mb-1 uppercase tracking-wide">→ Next Step</div>
      <div className="font-bold text-base mb-1">{task.title}</div>
      <div className="text-xs opacity-90 flex gap-3">
        {assigneeName && <span>👤 {assigneeName}</span>}
        <span>{ENERGY_LABEL[task.energy]}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write AIAnalysisPanel**

```tsx
// components/project-detail/AIAnalysisPanel.tsx
'use client'
import { useState } from 'react'
import type { ProjectAnalysis } from '@/lib/types'

interface Props {
  projectId: string
  analysis: ProjectAnalysis | null
  onSave: (data: { income_potential: string; build_difficulty: string; recommendation: string; raw_output: string }) => Promise<void>
}

export default function AIAnalysisPanel({ projectId, analysis, onSave }: Props) {
  const [pasting, setPasting] = useState(false)
  const [raw, setRaw] = useState('')
  const [income, setIncome] = useState(analysis?.income_potential ?? '')
  const [difficulty, setDifficulty] = useState(analysis?.build_difficulty ?? '')
  const [recommendation, setRecommendation] = useState(analysis?.recommendation ?? '')
  const [saving, setSaving] = useState(false)

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
        <a
          href="https://sooper-dooper-project-prioritizer.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-teal-600 font-medium"
        >
          Run analysis ↗
        </a>
      </div>

      {analysis && !pasting ? (
        <div className="space-y-2 text-sm">
          <div><span className="font-medium text-gray-500 text-xs uppercase">Income potential</span><p className="text-gray-800">{analysis.income_potential}</p></div>
          <div><span className="font-medium text-gray-500 text-xs uppercase">Build difficulty</span><p className="text-gray-800">{analysis.build_difficulty}</p></div>
          <div><span className="font-medium text-gray-500 text-xs uppercase">Recommendation</span><p className="text-gray-800">{analysis.recommendation}</p></div>
          <div className="flex items-center justify-between pt-1 text-xs text-gray-400">
            <span>Last analysed {new Date(analysis.analysed_at).toLocaleDateString('en-AU')}</span>
            <button onClick={() => setPasting(true)} className="text-teal-600 font-medium">Re-analyse →</button>
          </div>
        </div>
      ) : !pasting ? (
        <div className="text-sm text-gray-400 flex flex-col gap-2">
          <p>No analysis yet. Run the prioritizer and paste the results back here.</p>
          <button onClick={() => setPasting(true)} className="self-start text-teal-600 font-medium text-sm">Paste results →</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Income potential</label>
            <input value={income} onChange={e => setIncome(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. High — recurring subscription model" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Build difficulty</label>
            <input value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Medium — 4-6 weeks" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Recommendation</label>
            <input value={recommendation} onChange={e => setRecommendation(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Prioritise — high ROI" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Raw output (optional)</label>
            <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Paste full output from the tool here" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPasting(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Analysis'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Assemble Project Detail page (stub with NextStepCard + AIAnalysisPanel)**

```tsx
// app/projects/[id]/page.tsx
import { getProject, getProjectTasks, getProjectNotes, getProjectLinks, getProjectAnalysis, getGithubCache, saveProjectAnalysis } from '@/lib/queries/projects'
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getExpenseSummary, getRevenueTotal } from '@/lib/finance'
import { createClient } from '@/lib/supabase'
import NextStepCard from '@/components/project-detail/NextStepCard'
import AIAnalysisPanel from '@/components/project-detail/AIAnalysisPanel'
import { notFound } from 'next/navigation'

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [project, tasks, notes, links, analysis, githubCache, projectExpenses, projectRevenue] = await Promise.all([
    getProject(params.id).catch(() => null),
    getProjectTasks(params.id),
    getProjectNotes(params.id),
    getProjectLinks(params.id),
    getProjectAnalysis(params.id),
    getGithubCache(params.id),
    getExpenses(params.id),
    getRevenueEntries(params.id),
  ])

  if (!project) notFound()

  const nextStep = tasks.find(t => t.is_next_step && !t.completed) ?? null
  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)
  const expenseSummary = getExpenseSummary(projectExpenses)
  const revenueTotal = getRevenueTotal(projectRevenue)

  async function handleSaveAnalysis(data: Parameters<typeof saveProjectAnalysis>[0] extends { project_id: string } ? Omit<Parameters<typeof saveProjectAnalysis>[0], 'project_id' | 'analysed_by'> : never) {
    'use server'
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await saveProjectAnalysis({ ...data as any, project_id: params.id, analysed_by: user.id })
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8 flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{project.emoji}</span>
          <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{project.stage}</span>
          <span>{{ low: '💰', medium: '💰💰', high: '💰💰💰' }[project.revenue_score]}</span>
        </div>
      </div>

      {/* Summary */}
      {project.summary && <p className="text-gray-600 text-sm">{project.summary}</p>}

      {/* Next Step */}
      <NextStepCard task={nextStep} />

      {/* Mini P&L */}
      <div className="bg-white rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
        <div><div className="text-xs text-gray-400 mb-1">Revenue</div><div className="font-bold text-teal-700">${revenueTotal.toFixed(0)}</div></div>
        <div><div className="text-xs text-gray-400 mb-1">Expenses</div><div className="font-bold text-red-500">${expenseSummary.total.toFixed(0)}</div></div>
        <div><div className="text-xs text-gray-400 mb-1">P&L</div><div className={`font-bold ${revenueTotal - expenseSummary.total >= 0 ? 'text-green-600' : 'text-red-500'}`}>${(revenueTotal - expenseSummary.total).toFixed(0)}</div></div>
      </div>

      {/* AI Analysis */}
      <AIAnalysisPanel projectId={params.id} analysis={analysis} onSave={handleSaveAnalysis as any} />

      {/* Tasks — full TaskList component built in Phase 2 continuation */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Tasks ({activeTasks.length})</h3>
        {activeTasks.length === 0 && <p className="text-gray-400 text-sm">No tasks yet.</p>}
        {activeTasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
            <span className="text-sm text-gray-800 flex-1">{task.title}</span>
            {task.is_next_step && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">NEXT</span>}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Notes</h3>
        {notes.length === 0 && <p className="text-gray-400 text-sm">No notes yet.</p>}
        {notes.slice(0, 5).map(note => (
          <div key={note.id} className="py-2 border-b border-gray-50 last:border-0">
            <p className="text-sm text-gray-800">{note.content}</p>
            <p className="text-xs text-gray-400 mt-0.5">{note.author?.name ?? 'Auto'} · {new Date(note.created_at).toLocaleDateString('en-AU')}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create API route for project analysis save**

```typescript
// app/api/projects/[id]/analysis/route.ts
import { createClient } from '@/lib/supabase'
import { saveProjectAnalysis } from '@/lib/queries/projects'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  await saveProjectAnalysis({ ...body, project_id: params.id, analysed_by: user.id })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Test project detail in browser**

```bash
npm run dev
```

Create a project via `/projects`, then navigate to it. Verify: project header, mini P&L ($0/$0), AI Analysis panel (empty state with "Run analysis" link), tasks section (empty).

- [ ] **Step 6: Commit**

```bash
git add components/project-detail/ app/projects/[id]/ app/api/projects/
git commit -m "feat: project detail page — next step card, AI analysis panel, mini P&L, notes"
```

---

### Task 5: Phase 2 Smoke Test

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All existing tests still pass.

- [ ] **Step 2: Run a production build**

```bash
npm run build
```

Expected: 0 TypeScript errors, build succeeds.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: phase 2 smoke test — core screens complete"
```

**Phase 2 complete.** Home revenue dashboard, projects list, and project detail are all functional. Ready for Phase 3: Finance.
