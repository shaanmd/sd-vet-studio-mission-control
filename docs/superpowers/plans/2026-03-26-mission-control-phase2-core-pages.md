# Mission Control Phase 2: Core Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three most important screens — Home ("Right Now"), All Projects with GTD filtering, and Project Detail — making the app genuinely useful for daily project management.

**Architecture:** Server components for initial data fetch, client components for interactivity. Supabase queries via server client for pages, browser client for mutations and real-time. Shared data-fetching functions in `lib/queries/`.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase client

**Spec:** `docs/superpowers/specs/2026-03-26-mission-control-redesign-design.md`
**Depends on:** Phase 1 (Foundation) completed

---

### Task 1: Data Query Functions

**Files:**
- Create: `lib/queries/projects.ts`
- Create: `lib/queries/tasks.ts`
- Create: `lib/queries/personal-tasks.ts`

- [ ] **Step 1: Create project query functions**

Create `lib/queries/projects.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Project, ProjectWithDetails, Stage } from '@/lib/types/database'

export async function getProjects(stage?: Stage) {
  const supabase = await createClient()
  let query = supabase
    .from('projects')
    .select('*')
    .neq('stage', 'archived')
    .order('updated_at', { ascending: false })

  if (stage) {
    query = query.eq('stage', stage)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Project[]
}

export async function getPinnedProjects() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks!tasks_project_id_fkey(*),
      project_links(*),
      github_cache(*)
    `)
    .eq('pinned', true)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (error) throw error
  return (data ?? []).map((p) => ({
    ...p,
    next_step: p.tasks?.find((t: { is_next_step: boolean; completed: boolean }) => t.is_next_step && !t.completed) ?? null,
    github_cache: p.github_cache?.[0] ?? null,
  })) as ProjectWithDetails[]
}

export async function getProject(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks!tasks_project_id_fkey(*),
      project_links(*),
      project_notes(*),
      github_cache(*),
      leads(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return {
    ...data,
    next_step: data.tasks?.find((t: { is_next_step: boolean; completed: boolean }) => t.is_next_step && !t.completed) ?? null,
    github_cache: data.github_cache?.[0] ?? null,
  } as ProjectWithDetails & {
    project_notes: import('@/lib/types/database').ProjectNote[]
    leads: import('@/lib/types/database').Lead[]
  }
}

export async function getProjectCounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('stage')
    .neq('stage', 'archived')

  if (error) throw error
  const counts: Record<string, number> = { all: 0 }
  for (const row of data ?? []) {
    counts.all++
    counts[row.stage] = (counts[row.stage] ?? 0) + 1
  }
  return counts
}
```

- [ ] **Step 2: Create task query functions**

Create `lib/queries/tasks.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types/database'

export async function getProjectTasks(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('completed', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data as Task[]
}
```

- [ ] **Step 3: Create personal task query functions**

Create `lib/queries/personal-tasks.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { PersonalTaskWithProject } from '@/lib/types/database'

export async function getPersonalTasks(ownerId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('personal_tasks')
    .select(`
      *,
      project:projects(id, name, emoji)
    `)
    .eq('owner_id', ownerId)
    .eq('completed', false)
    .order('sort_order', { ascending: true })
    .limit(3)

  if (error) throw error
  return data as PersonalTaskWithProject[]
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/queries/
git commit -m "feat: add data query functions for projects, tasks, personal tasks"
```

---

### Task 2: Client-Side Mutation Functions

**Files:**
- Create: `lib/mutations/projects.ts`
- Create: `lib/mutations/tasks.ts`
- Create: `lib/mutations/personal-tasks.ts`

- [ ] **Step 1: Create project mutations**

Create `lib/mutations/projects.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Stage } from '@/lib/types/database'

const supabase = createClient()

export async function createProject(data: {
  name: string
  summary?: string
  stage?: Stage
  emoji?: string
  created_by: string
}) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      name: data.name,
      summary: data.summary ?? null,
      stage: data.stage ?? 'inbox',
      emoji: data.emoji ?? '📁',
      created_by: data.created_by,
      updated_by: data.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return project
}

export async function updateProjectStage(id: string, stage: Stage, userId: string) {
  const { error } = await supabase
    .from('projects')
    .update({ stage, updated_by: userId })
    .eq('id', id)

  if (error) throw error
}

export async function toggleProjectPin(id: string, pinned: boolean, userId: string) {
  const { error } = await supabase
    .from('projects')
    .update({ pinned, updated_by: userId })
    .eq('id', id)

  if (error) throw error
}

export async function updateProjectSummary(id: string, summary: string, userId: string) {
  const { error } = await supabase
    .from('projects')
    .update({ summary, updated_by: userId })
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 2: Create task mutations**

Create `lib/mutations/tasks.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Energy } from '@/lib/types/database'

const supabase = createClient()

export async function createTask(data: {
  project_id: string
  title: string
  assigned_to?: string | null
  is_shared?: boolean
  energy?: Energy
}) {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      project_id: data.project_id,
      title: data.title,
      assigned_to: data.assigned_to ?? null,
      is_shared: data.is_shared ?? false,
      energy: data.energy ?? 'medium',
    })
    .select()
    .single()

  if (error) throw error
  return task
}

export async function completeTask(id: string, completedBy: string) {
  const { error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq('id', id)

  if (error) throw error
}

export async function setNextStep(projectId: string, taskId: string) {
  // Clear existing next step
  await supabase
    .from('tasks')
    .update({ is_next_step: false })
    .eq('project_id', projectId)
    .eq('is_next_step', true)

  // Set new next step
  const { error } = await supabase
    .from('tasks')
    .update({ is_next_step: true })
    .eq('id', taskId)

  if (error) throw error
}
```

- [ ] **Step 3: Create personal task mutations**

Create `lib/mutations/personal-tasks.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { Energy } from '@/lib/types/database'

const supabase = createClient()

export async function createPersonalTask(data: {
  title: string
  owner_id: string
  project_id?: string | null
  energy?: Energy
}) {
  const { data: task, error } = await supabase
    .from('personal_tasks')
    .insert({
      title: data.title,
      owner_id: data.owner_id,
      project_id: data.project_id ?? null,
      energy: data.energy ?? 'medium',
    })
    .select()
    .single()

  if (error) throw error
  return task
}

export async function completePersonalTask(id: string) {
  const { error } = await supabase
    .from('personal_tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/mutations/
git commit -m "feat: add client-side mutation functions for projects, tasks"
```

---

### Task 3: Home Screen — "Right Now" View

**Files:**
- Modify: `app/page.tsx`
- Create: `components/home/YourNext3.tsx`
- Create: `components/home/FocusProjects.tsx`
- Create: `components/home/QuickActions.tsx`

- [ ] **Step 1: Create the YourNext3 component**

Create `components/home/YourNext3.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { completePersonalTask } from '@/lib/mutations/personal-tasks'
import type { PersonalTaskWithProject, Profile } from '@/lib/types/database'

interface YourNext3Props {
  debTasks: PersonalTaskWithProject[]
  shaanTasks: PersonalTaskWithProject[]
  profiles: Profile[]
}

export function YourNext3({ debTasks, shaanTasks, profiles }: YourNext3Props) {
  const { profile } = useAuth()
  const debProfile = profiles.find((p) => p.name === 'Deb')
  const shaanProfile = profiles.find((p) => p.name === 'Shaan')

  const [activeTab, setActiveTab] = useState<string>(
    profile?.name === 'Shaan' ? 'shaan' : 'deb'
  )
  const [completingId, setCompletingId] = useState<string | null>(null)

  const tasks = activeTab === 'deb' ? debTasks : shaanTasks
  const otherPersonTasks = activeTab === 'deb' ? shaanTasks : debTasks
  const otherName = activeTab === 'deb' ? 'Shaan' : 'Deb'

  async function handleComplete(id: string) {
    setCompletingId(id)
    try {
      await completePersonalTask(id)
    } finally {
      setCompletingId(null)
    }
  }

  // Check if other person has a task pointing to same project
  function isSharedProject(projectId: string | null) {
    if (!projectId) return false
    return otherPersonTasks.some((t) => t.project_id === projectId)
  }

  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-[2px] text-[#D4A853] font-semibold mb-3">
        Your Next 3
      </div>

      {/* Tabs */}
      <div className="flex mb-3">
        <button
          onClick={() => setActiveTab('deb')}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold rounded-l-lg transition-colors ${
            activeTab === 'deb'
              ? 'bg-[#1E6B5E] text-white'
              : 'bg-white text-[#8899a6] border border-black/10 border-l-0'
          }`}
        >
          Deb
        </button>
        <button
          onClick={() => setActiveTab('shaan')}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold rounded-r-lg transition-colors ${
            activeTab === 'shaan'
              ? 'bg-[#1E6B5E] text-white'
              : 'bg-white text-[#8899a6] border border-black/10 border-r-0'
          }`}
        >
          Shaan
        </button>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-black/8 overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#8899a6]">
            No tasks yet. Add your top 3 priorities!
          </div>
        ) : (
          tasks.map((task, i) => (
            <div
              key={task.id}
              className={`flex items-center gap-3 px-3.5 py-3 ${
                i < tasks.length - 1 ? 'border-b border-black/5' : ''
              }`}
            >
              <button
                onClick={() => handleComplete(task.id)}
                disabled={completingId === task.id}
                className="w-[22px] h-[22px] rounded-md border-2 border-[#1E6B5E] flex-shrink-0 hover:bg-[#1E6B5E]/10 transition-colors disabled:opacity-50"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#2C3E50] truncate">
                  {task.title}
                </div>
                {task.project && (
                  <div className="text-[11px] text-[#8899a6] mt-0.5">
                    {task.project.emoji} {task.project.name}
                  </div>
                )}
              </div>
              {isSharedProject(task.project_id) && (
                <div className="text-[10px] bg-[#D4A853]/15 text-[#b45309] px-1.5 py-0.5 rounded whitespace-nowrap">
                  {otherName} too
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the FocusProjects component**

Create `components/home/FocusProjects.tsx`:
```tsx
import Link from 'next/link'
import type { ProjectWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

interface FocusProjectsProps {
  projects: ProjectWithDetails[]
}

const stageColors: Record<string, string> = {
  inbox: 'bg-[#b45309] text-white',
  someday: 'bg-[#8899a6] text-white',
  exploring: 'bg-[#b45309] text-white',
  building: 'bg-[#1E6B5E] text-white',
  live: 'bg-[#059669] text-white',
  maintenance: 'bg-[#6b7280] text-white',
}

export function FocusProjects({ projects }: FocusProjectsProps) {
  return (
    <div className="mb-6">
      <div className="text-[11px] uppercase tracking-[2px] text-[#D4A853] font-semibold mb-3">
        Focus Projects
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/8 p-6 text-center">
          <p className="text-sm text-[#8899a6]">
            No pinned projects yet. Pin up to 3 from your project list.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white border border-black/8 rounded-xl p-3.5 block hover:border-[#1E6B5E]/30 transition-colors"
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="font-semibold text-[15px] text-[#2C3E50]">
                  {project.emoji} {project.name}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${stageColors[project.stage] ?? 'bg-gray-200'}`}>
                  {project.stage}
                </span>
              </div>

              {/* Auto status line */}
              <div className="text-[12px] text-[#8899a6] mb-2">
                {project.github_cache?.last_commit_at
                  ? `Last commit ${formatDistanceToNow(project.github_cache.last_commit_at)}`
                  : 'No commit data'}
                {project.github_cache?.deploy_status === 'ready' && ' · Deployed ✓'}
                {project.github_cache?.deploy_status === 'error' && ' · Deploy ⚠️'}
              </div>

              {/* Next step */}
              {project.next_step ? (
                <div className="bg-[#D4A853]/8 rounded-lg p-2.5 flex items-start gap-2">
                  <span className="text-[#D4A853] text-sm">→</span>
                  <div className="text-[13px] text-[#b45309]">
                    <strong>Next:</strong> {project.next_step.title}
                  </div>
                </div>
              ) : (
                <div className="text-[12px] text-[#8899a6] italic">
                  No next step set
                </div>
              )}

              <div className="text-[11px] text-[#8899a6] mt-2 text-right">
                Tap for full details + all tasks →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create date utility**

Create `lib/utils/dates.ts`:
```typescript
export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
```

- [ ] **Step 4: Create the QuickActions component**

Create `components/home/QuickActions.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createProject } from '@/lib/mutations/projects'
import { useRouter } from 'next/navigation'

export function QuickActions() {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [ideaName, setIdeaName] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!ideaName.trim() || !user) return
    setSaving(true)
    try {
      await createProject({
        name: ideaName.trim(),
        created_by: user.id,
      })
      setIdeaName('')
      setShowQuickAdd(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {showQuickAdd && (
        <form onSubmit={handleQuickAdd} className="mb-4 bg-white rounded-xl border border-black/8 p-3.5">
          <input
            type="text"
            value={ideaName}
            onChange={(e) => setIdeaName(e.target.value)}
            placeholder="Brain dump your idea..."
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !ideaName.trim()}
              className="flex-1 py-2 rounded-lg bg-[#1E6B5E] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add to Inbox'}
            </button>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="px-3 py-2 rounded-lg border border-black/10 text-sm text-[#8899a6]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex-1 bg-white border border-black/8 rounded-xl p-3 text-center text-[11px] text-[#8899a6] hover:border-[#1E6B5E]/30 transition-colors"
        >
          <div className="text-lg mb-1">📥</div>
          Quick Add
        </button>
        <Link
          href="/projects"
          className="flex-1 bg-white border border-black/8 rounded-xl p-3 text-center text-[11px] text-[#8899a6] hover:border-[#1E6B5E]/30 transition-colors"
        >
          <div className="text-lg mb-1">📂</div>
          All Projects
        </Link>
        <Link
          href="/resources"
          className="flex-1 bg-white border border-black/8 rounded-xl p-3 text-center text-[11px] text-[#8899a6] hover:border-[#1E6B5E]/30 transition-colors"
        >
          <div className="text-lg mb-1">🔗</div>
          Resources
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire up the Home page with server-side data fetching**

Replace `app/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { getPinnedProjects } from '@/lib/queries/projects'
import { getPersonalTasks } from '@/lib/queries/personal-tasks'
import { YourNext3 } from '@/components/home/YourNext3'
import { FocusProjects } from '@/components/home/FocusProjects'
import { QuickActions } from '@/components/home/QuickActions'
import type { Profile } from '@/lib/types/database'

export default async function HomePage() {
  const supabase = await createClient()

  // Get all profiles
  const { data: profiles } = await supabase.from('profiles').select('*')
  const allProfiles = (profiles ?? []) as Profile[]
  const debProfile = allProfiles.find((p) => p.name === 'Deb')
  const shaanProfile = allProfiles.find((p) => p.name === 'Shaan')

  // Fetch data in parallel
  const [pinnedProjects, debTasks, shaanTasks] = await Promise.all([
    getPinnedProjects(),
    debProfile ? getPersonalTasks(debProfile.id) : Promise.resolve([]),
    shaanProfile ? getPersonalTasks(shaanProfile.id) : Promise.resolve([]),
  ])

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[2px] text-[#1E6B5E] font-semibold md:hidden">
            SD VetStudio
          </div>
          <h1 className="text-xl font-bold text-[#2C3E50]">
            <span className="md:hidden">Mission Control</span>
            <span className="hidden md:inline">Home</span>
          </h1>
        </div>
        <div className="text-sm text-[#8899a6]">
          {new Date().toLocaleDateString('en-NZ', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          })}
        </div>
      </div>

      <YourNext3
        debTasks={debTasks}
        shaanTasks={shaanTasks}
        profiles={allProfiles}
      />

      <FocusProjects projects={pinnedProjects} />

      <QuickActions />
    </div>
  )
}
```

- [ ] **Step 6: Verify the home screen renders**

Run: `npm run dev`
Navigate to: `http://localhost:3000`
Expected: Home screen with "Your Next 3" tabs, Focus Projects section (empty initially), and Quick Actions.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx components/home/ lib/utils/ lib/queries/ lib/mutations/
git commit -m "feat: build Home screen with Your Next 3, Focus Projects, Quick Actions"
```

---

### Task 4: All Projects Page with GTD Filtering

**Files:**
- Modify: `app/projects/page.tsx`
- Create: `components/projects/ProjectList.tsx`
- Create: `components/projects/StageFilter.tsx`
- Create: `components/projects/CreateProjectModal.tsx`
- Create: `components/projects/StageTriage.tsx`

- [ ] **Step 1: Create the StageFilter component**

Create `components/projects/StageFilter.tsx`:
```tsx
'use client'

import type { Stage } from '@/lib/types/database'

interface StageFilterProps {
  activeFilter: Stage | 'all'
  counts: Record<string, number>
  onFilter: (stage: Stage | 'all') => void
}

const stages: { key: Stage | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '' },
  { key: 'inbox', label: 'Inbox', icon: '📥' },
  { key: 'someday', label: 'Someday', icon: '💤' },
  { key: 'exploring', label: 'Exploring', icon: '🔍' },
  { key: 'building', label: 'Building', icon: '🔨' },
  { key: 'live', label: 'Live', icon: '🟢' },
  { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
]

export function StageFilter({ activeFilter, counts, onFilter }: StageFilterProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
      {stages.map((s) => (
        <button
          key={s.key}
          onClick={() => onFilter(s.key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors whitespace-nowrap ${
            activeFilter === s.key
              ? 'bg-[#2C3E50] text-white'
              : 'bg-white text-[#8899a6] border border-black/10'
          }`}
        >
          {s.icon} {s.label} ({counts[s.key] ?? 0})
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create the StageTriage bottom sheet**

Create `components/projects/StageTriage.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { updateProjectStage } from '@/lib/mutations/projects'
import type { Stage } from '@/lib/types/database'

interface StageTriageProps {
  projectId: string
  projectName: string
  onClose: () => void
  onSuccess: () => void
}

const triageStages: { key: Stage; label: string; icon: string }[] = [
  { key: 'someday', label: 'Someday/Maybe', icon: '💤' },
  { key: 'exploring', label: 'Exploring', icon: '🔍' },
  { key: 'building', label: 'Building', icon: '🔨' },
  { key: 'live', label: 'Live', icon: '🟢' },
  { key: 'maintenance', label: 'Maintenance', icon: '🔧' },
  { key: 'archived', label: 'Archive', icon: '📦' },
]

export function StageTriage({ projectId, projectName, onClose, onSuccess }: StageTriageProps) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  async function handleSort(stage: Stage) {
    if (!user) return
    setSaving(true)
    try {
      await updateProjectStage(projectId, stage, user.id)
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm p-5 md:mb-0">
        <h3 className="text-sm font-semibold text-[#2C3E50] mb-1">Sort: {projectName}</h3>
        <p className="text-xs text-[#8899a6] mb-4">Pick a stage</p>
        <div className="grid grid-cols-2 gap-2">
          {triageStages.map((s) => (
            <button
              key={s.key}
              onClick={() => handleSort(s.key)}
              disabled={saving}
              className="px-3 py-2.5 rounded-lg border border-black/10 text-sm text-[#2C3E50] hover:bg-[#1E6B5E]/10 hover:border-[#1E6B5E]/30 transition-colors disabled:opacity-50 text-left"
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create the CreateProjectModal**

Create `components/projects/CreateProjectModal.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createProject } from '@/lib/mutations/projects'
import { useRouter } from 'next/navigation'
import type { Stage } from '@/lib/types/database'

interface CreateProjectModalProps {
  onClose: () => void
}

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stage, setStage] = useState<Stage>('inbox')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true)
    try {
      const project = await createProject({
        name: name.trim(),
        summary: description.trim() || undefined,
        stage,
        created_by: user.id,
      })
      router.push(`/projects/${project.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm p-5">
        <h3 className="text-base font-semibold text-[#2C3E50] mb-4">New Project</h3>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] mb-3"
            autoFocus
            required
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One-line description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] mb-3"
          />
          <div className="flex gap-2 flex-wrap mb-4">
            {(['inbox', 'someday', 'exploring', 'building'] as Stage[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  stage === s
                    ? 'bg-[#1E6B5E] text-white'
                    : 'bg-[#F5F0E8] text-[#8899a6]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-lg bg-[#1E6B5E] text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-lg border border-black/10 text-sm text-[#8899a6]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create the ProjectList component**

Create `components/projects/ProjectList.tsx`:
```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Project, Stage } from '@/lib/types/database'
import { StageFilter } from './StageFilter'
import { CreateProjectModal } from './CreateProjectModal'
import { StageTriage } from './StageTriage'
import { formatDistanceToNow } from '@/lib/utils/dates'
import { useRouter } from 'next/navigation'

interface ProjectListProps {
  projects: Project[]
  counts: Record<string, number>
}

const stageOrder: Stage[] = ['inbox', 'building', 'exploring', 'live', 'someday', 'maintenance']
const stageLabels: Record<string, { label: string; icon: string; color: string }> = {
  inbox: { label: 'Inbox', icon: '📥', color: 'text-[#b45309]' },
  someday: { label: 'Someday / Maybe', icon: '💤', color: 'text-[#8899a6]' },
  exploring: { label: 'Exploring', icon: '🔍', color: 'text-[#b45309]' },
  building: { label: 'Building', icon: '🔨', color: 'text-[#1E6B5E]' },
  live: { label: 'Live', icon: '🟢', color: 'text-[#059669]' },
  maintenance: { label: 'Maintenance', icon: '🔧', color: 'text-[#6b7280]' },
}

export function ProjectList({ projects, counts }: ProjectListProps) {
  const [filter, setFilter] = useState<Stage | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [triaging, setTriaging] = useState<Project | null>(null)
  const router = useRouter()

  const filtered = projects.filter((p) => {
    if (filter !== 'all' && p.stage !== filter) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by stage
  const grouped = stageOrder.reduce<Record<string, Project[]>>((acc, stage) => {
    const stageProjects = filtered.filter((p) => p.stage === stage)
    if (stageProjects.length > 0) acc[stage] = stageProjects
    return acc
  }, {})

  return (
    <div>
      {/* Search + New */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search projects..."
          className="flex-1 px-3 py-2.5 rounded-lg border border-black/10 bg-white text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2.5 rounded-lg bg-[#1E6B5E] text-white text-sm font-semibold whitespace-nowrap"
        >
          + New
        </button>
      </div>

      <StageFilter activeFilter={filter} counts={counts} onFilter={setFilter} />

      {/* Grouped project lists */}
      <div className="mt-4 space-y-4">
        {Object.entries(grouped).map(([stage, stageProjects]) => {
          const info = stageLabels[stage]
          const isInbox = stage === 'inbox'
          return (
            <div key={stage}>
              <div className={`text-[11px] uppercase tracking-[2px] font-semibold mb-2 flex items-center gap-1.5 ${info?.color ?? ''}`}>
                {info?.icon} {info?.label}
                <span className="text-[#8899a6] font-normal">({stageProjects.length})</span>
                {isInbox && stageProjects.length > 0 && (
                  <span className="bg-[#b45309] text-white text-[9px] px-1.5 py-0.5 rounded-full ml-1">
                    NEEDS SORTING
                  </span>
                )}
              </div>
              <div className="bg-white rounded-xl border border-black/8 overflow-hidden">
                {stageProjects.map((project, i) => (
                  <div
                    key={project.id}
                    className={`flex items-center gap-2.5 px-3.5 py-3 ${
                      i < stageProjects.length - 1 ? 'border-b border-black/5' : ''
                    }`}
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <span className="text-base">{project.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#2C3E50] truncate">
                          {project.name}
                        </div>
                        <div className="text-[11px] text-[#8899a6]">
                          {formatDistanceToNow(project.updated_at)}
                        </div>
                      </div>
                    </Link>
                    {isInbox && (
                      <button
                        onClick={() => setTriaging(project)}
                        className="text-[10px] bg-[#1E6B5E]/10 text-[#1E6B5E] px-2 py-1 rounded font-medium"
                      >
                        Sort →
                      </button>
                    )}
                    {!isInbox && (
                      <Link href={`/projects/${project.id}`} className="text-[#ccc]">›</Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {Object.keys(grouped).length === 0 && (
          <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
            <p className="text-sm text-[#8899a6]">
              {search ? 'No projects match your search.' : 'No projects yet. Tap + New to add your first one.'}
            </p>
          </div>
        )}
      </div>

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      {triaging && (
        <StageTriage
          projectId={triaging.id}
          projectName={triaging.name}
          onClose={() => setTriaging(null)}
          onSuccess={() => {
            setTriaging(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Wire up the All Projects page**

Replace `app/projects/page.tsx`:
```tsx
import { getProjects, getProjectCounts } from '@/lib/queries/projects'
import { ProjectList } from '@/components/projects/ProjectList'

export default async function ProjectsPage() {
  const [projects, counts] = await Promise.all([
    getProjects(),
    getProjectCounts(),
  ])

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2C3E50]">All Projects</h1>
        <p className="text-sm text-[#8899a6] mt-0.5">{counts.all ?? 0} projects across {Object.keys(counts).length - 1} stages</p>
      </div>
      <ProjectList projects={projects} counts={counts} />
    </div>
  )
}
```

- [ ] **Step 6: Verify the projects page renders**

Run: `npm run dev`
Navigate to: `http://localhost:3000/projects`
Expected: Empty state or project list with stage filtering and search.

- [ ] **Step 7: Commit**

```bash
git add app/projects/page.tsx components/projects/
git commit -m "feat: build All Projects page with GTD filtering, search, create, triage"
```

---

### Task 5: Project Detail Page

**Files:**
- Create: `app/projects/[id]/page.tsx`
- Create: `components/project-detail/ProjectHeader.tsx`
- Create: `components/project-detail/ProjectSummary.tsx`
- Create: `components/project-detail/TaskList.tsx`
- Create: `components/project-detail/KeyLinks.tsx`
- Create: `components/project-detail/AutoStatus.tsx`
- Create: `components/project-detail/NotesLog.tsx`
- Create: `lib/mutations/notes.ts`

- [ ] **Step 1: Create note mutations**

Create `lib/mutations/notes.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function addProjectNote(data: {
  project_id: string
  author_id: string
  content: string
}) {
  const { error } = await supabase
    .from('project_notes')
    .insert({
      project_id: data.project_id,
      author_id: data.author_id,
      content: data.content,
      note_type: 'note',
    })

  if (error) throw error
}
```

- [ ] **Step 2: Create ProjectHeader component**

Create `components/project-detail/ProjectHeader.tsx`:
```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { toggleProjectPin, updateProjectStage } from '@/lib/mutations/projects'
import type { Project, Stage } from '@/lib/types/database'
import { useState } from 'react'

interface ProjectHeaderProps {
  project: Project
}

const stages: Stage[] = ['inbox', 'someday', 'exploring', 'building', 'live', 'maintenance']

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [showStages, setShowStages] = useState(false)

  async function handlePin() {
    if (!user) return
    try {
      await toggleProjectPin(project.id, !project.pinned, user.id)
      router.refresh()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      if (msg.includes('Maximum of 3')) {
        alert('You already have 3 pinned projects. Unpin one first.')
      }
    }
  }

  async function handleStageChange(stage: Stage) {
    if (!user) return
    await updateProjectStage(project.id, stage, user.id)
    setShowStages(false)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-3 mb-4">
      <button onClick={() => router.back()} className="text-base text-[#8899a6]">
        ←
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-[#2C3E50] truncate">
          {project.emoji} {project.name}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setShowStages(!showStages)}
            className="bg-[#1E6B5E] text-white text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold"
          >
            {project.stage}
          </button>
          <span className="text-[11px] text-[#8899a6]">
            Started {new Date(project.created_at).toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })}
          </span>
        </div>
        {showStages && (
          <div className="flex gap-1.5 flex-wrap mt-2">
            {stages.map((s) => (
              <button
                key={s}
                onClick={() => handleStageChange(s)}
                className={`px-2 py-1 rounded text-[10px] font-medium ${
                  s === project.stage
                    ? 'bg-[#1E6B5E] text-white'
                    : 'bg-[#F5F0E8] text-[#8899a6] hover:bg-[#1E6B5E]/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handlePin}
        className={`text-xl ${project.pinned ? 'text-[#D4A853]' : 'text-[#ccc]'}`}
        title={project.pinned ? 'Unpin from focus' : 'Pin to focus'}
      >
        {project.pinned ? '⭐' : '☆'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create ProjectSummary component**

Create `components/project-detail/ProjectSummary.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { updateProjectSummary } from '@/lib/mutations/projects'
import { useRouter } from 'next/navigation'

interface ProjectSummaryProps {
  projectId: string
  summary: string | null
}

export function ProjectSummary({ projectId, summary }: ProjectSummaryProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(summary ?? '')
  const { user } = useAuth()
  const router = useRouter()

  async function handleSave() {
    if (!user) return
    await updateProjectSummary(projectId, value, user.id)
    setEditing(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-black/8 p-3.5 mb-3">
      <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2">
        Summary
      </div>
      {editing ? (
        <div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold">Save</button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg border border-black/10 text-xs text-[#8899a6]">Cancel</button>
          </div>
        </div>
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="text-sm text-[#4a5568] leading-relaxed cursor-pointer hover:bg-[#F5F0E8] rounded p-1 -m-1 transition-colors"
        >
          {summary || 'Tap to add a summary...'}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create TaskList component**

Create `components/project-detail/TaskList.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createTask, completeTask, setNextStep } from '@/lib/mutations/tasks'
import { useRouter } from 'next/navigation'
import type { Task, Profile } from '@/lib/types/database'

interface TaskListProps {
  projectId: string
  tasks: Task[]
  profiles: Profile[]
}

const energyIcons: Record<string, string> = {
  high: '⚡',
  medium: '☕',
  low: '🛋️',
}

export function TaskList({ projectId, tasks, profiles }: TaskListProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !user) return
    setSaving(true)
    try {
      await createTask({ project_id: projectId, title: newTitle.trim() })
      setNewTitle('')
      setShowAdd(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete(taskId: string) {
    if (!user) return
    await completeTask(taskId, user.id)
    router.refresh()
  }

  async function handleSetNext(taskId: string) {
    await setNextStep(projectId, taskId)
    router.refresh()
  }

  function getAssigneeName(task: Task) {
    if (task.is_shared) return 'Deb & Shaan'
    if (!task.assigned_to) return 'Unassigned'
    return profiles.find((p) => p.id === task.assigned_to)?.name ?? 'Unknown'
  }

  return (
    <div className="bg-white rounded-xl border border-black/8 overflow-hidden mb-3">
      <div className="px-3.5 py-3 border-b border-black/5 flex justify-between items-center">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          Tasks ({activeTasks.length})
        </div>
        <button onClick={() => setShowAdd(true)} className="text-xs text-[#1E6B5E] font-medium">
          + Add
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="px-3.5 py-3 border-b border-black/5 bg-[#F5F0E8]/50">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold disabled:opacity-50">
              {saving ? 'Adding...' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-black/10 text-xs text-[#8899a6]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {activeTasks.map((task) => (
        <div key={task.id} className={`flex items-center gap-2.5 px-3.5 py-3 border-b border-black/5 ${task.is_next_step ? 'bg-[#D4A853]/5' : ''}`}>
          <button
            onClick={() => handleComplete(task.id)}
            className="w-5 h-5 rounded-md border-2 border-[#1E6B5E] flex-shrink-0 hover:bg-[#1E6B5E]/10"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#2C3E50]">{task.title}</div>
            <div className="text-[11px] text-[#8899a6]">{getAssigneeName(task)}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs">{energyIcons[task.energy]}</span>
            {task.is_next_step ? (
              <span className="text-[9px] bg-[#D4A853] text-white px-1.5 py-0.5 rounded font-semibold">NEXT</span>
            ) : (
              <button
                onClick={() => handleSetNext(task.id)}
                className="text-[9px] text-[#8899a6] hover:text-[#D4A853] px-1.5 py-0.5"
                title="Set as next step"
              >
                →
              </button>
            )}
          </div>
        </div>
      ))}

      {activeTasks.length === 0 && !showAdd && (
        <div className="px-3.5 py-4 text-center text-sm text-[#8899a6]">
          No tasks yet. Add one to get started.
        </div>
      )}

      {completedTasks.length > 0 && (
        <>
          <div className="px-3.5 py-2 bg-[#F5F0E8]/50 text-[10px] text-[#8899a6] uppercase tracking-wider font-semibold">
            Completed ({completedTasks.length})
          </div>
          {completedTasks.slice(0, 5).map((task) => (
            <div key={task.id} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-black/5">
              <div className="w-5 h-5 rounded-md bg-[#1E6B5E] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-[13px] text-[#8899a6] line-through truncate">{task.title}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create KeyLinks component**

Create `components/project-detail/KeyLinks.tsx`:
```tsx
import type { ProjectLink } from '@/lib/types/database'

interface KeyLinksProps {
  links: ProjectLink[]
}

export function KeyLinks({ links }: KeyLinksProps) {
  if (links.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-black/8 overflow-hidden mb-3">
      <div className="px-3.5 py-3 border-b border-black/5">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          Key Links
        </div>
      </div>
      <div className="grid grid-cols-2">
        {links.map((link, i) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3.5 py-3 hover:bg-[#F5F0E8] transition-colors ${
              i % 2 === 0 ? 'border-r border-black/5' : ''
            } ${i < links.length - 2 ? 'border-b border-black/5' : ''}`}
          >
            <div className="text-sm mb-0.5">{link.icon}</div>
            <div className="text-xs font-medium text-[#1E6B5E]">{link.label}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create AutoStatus component**

Create `components/project-detail/AutoStatus.tsx`:
```tsx
import type { GitHubCache } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

interface AutoStatusProps {
  cache: GitHubCache | null
}

export function AutoStatus({ cache }: AutoStatusProps) {
  if (!cache) return null

  const statusIcon = cache.deploy_status === 'ready' ? '✓' : cache.deploy_status === 'error' ? '⚠️' : '🔄'
  const statusColor = cache.deploy_status === 'ready' ? 'text-[#059669]' : cache.deploy_status === 'error' ? 'text-red-500' : 'text-[#D4A853]'

  return (
    <div className="bg-white rounded-xl border border-black/8 p-3.5 mb-3">
      <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2.5">
        Auto Status
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-[#8899a6]">Last commit</span>
          <span className="font-medium">{cache.last_commit_at ? formatDistanceToNow(cache.last_commit_at) : '—'}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-[#8899a6]">Deployment</span>
          <span className={`font-medium ${statusColor}`}>{statusIcon} {cache.deploy_status ?? '—'}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-[#8899a6]">Open PRs</span>
          <span className="font-medium">{cache.open_prs}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create NotesLog component**

Create `components/project-detail/NotesLog.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { addProjectNote } from '@/lib/mutations/notes'
import { useRouter } from 'next/navigation'
import type { ProjectNote, Profile } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

interface NotesLogProps {
  projectId: string
  notes: ProjectNote[]
  profiles: Profile[]
}

export function NotesLog({ projectId, notes, profiles }: NotesLogProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const sorted = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !user) return
    setSaving(true)
    try {
      await addProjectNote({ project_id: projectId, author_id: user.id, content: content.trim() })
      setContent('')
      setShowAdd(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function getAuthorName(authorId: string | null) {
    if (!authorId) return 'Auto'
    return profiles.find((p) => p.id === authorId)?.name ?? 'Unknown'
  }

  return (
    <div className="bg-white rounded-xl border border-black/8 overflow-hidden mb-3">
      <div className="px-3.5 py-3 border-b border-black/5 flex justify-between items-center">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          Notes & Log
        </div>
        <button onClick={() => setShowAdd(true)} className="text-xs text-[#1E6B5E] font-medium">
          + Add Note
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="px-3.5 py-3 border-b border-black/5 bg-[#F5F0E8]/50">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a note..."
            className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] resize-none mb-2"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-black/10 text-xs text-[#8899a6]">
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 && !showAdd && (
        <div className="px-3.5 py-4 text-center text-sm text-[#8899a6]">
          No notes yet.
        </div>
      )}

      {sorted.map((note) => (
        <div key={note.id} className="px-3.5 py-3 border-b border-black/5 last:border-0">
          <div className="text-[11px] text-[#8899a6] mb-1">
            {getAuthorName(note.author_id)} · {formatDistanceToNow(note.created_at)}
          </div>
          <div className={`text-[13px] leading-relaxed ${note.note_type !== 'note' ? 'text-[#8899a6] italic' : 'text-[#2C3E50]'}`}>
            {note.content}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 8: Create the Project Detail page**

Create `app/projects/[id]/page.tsx`:
```tsx
import { getProject } from '@/lib/queries/projects'
import { createClient } from '@/lib/supabase/server'
import { ProjectHeader } from '@/components/project-detail/ProjectHeader'
import { ProjectSummary } from '@/components/project-detail/ProjectSummary'
import { TaskList } from '@/components/project-detail/TaskList'
import { KeyLinks } from '@/components/project-detail/KeyLinks'
import { AutoStatus } from '@/components/project-detail/AutoStatus'
import { NotesLog } from '@/components/project-detail/NotesLog'
import type { Profile, Task } from '@/lib/types/database'
import { notFound } from 'next/navigation'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let project
  try {
    project = await getProject(id)
  } catch {
    notFound()
  }

  const supabase = await createClient()
  const { data: profiles } = await supabase.from('profiles').select('*')
  const allProfiles = (profiles ?? []) as Profile[]

  // Sort tasks: next step first, then by sort_order
  const sortedTasks = [...(project.tasks ?? [])].sort((a: Task, b: Task) => {
    if (a.is_next_step && !a.completed) return -1
    if (b.is_next_step && !b.completed) return 1
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    return a.sort_order - b.sort_order
  })

  // Next step highlight
  const nextStep = sortedTasks.find((t: Task) => t.is_next_step && !t.completed)

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <ProjectHeader project={project} />

      <ProjectSummary projectId={project.id} summary={project.summary} />

      {/* Next Step Highlight */}
      {nextStep && (
        <div className="bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-xl p-3.5 mb-3">
          <div className="text-[11px] uppercase tracking-[2px] text-[#D4A853] font-semibold mb-2">
            Next Step to Level Up
          </div>
          <div className="flex items-start gap-2">
            <span className="text-[#D4A853] text-base">→</span>
            <div>
              <div className="text-sm font-semibold text-[#b45309]">{nextStep.title}</div>
              <div className="text-[12px] text-[#8899a6] mt-1">
                Assigned to{' '}
                <strong className="text-[#2C3E50]">
                  {nextStep.is_shared
                    ? 'Deb & Shaan'
                    : allProfiles.find((p) => p.id === nextStep.assigned_to)?.name ?? 'Unassigned'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <TaskList projectId={project.id} tasks={sortedTasks} profiles={allProfiles} />

      <KeyLinks links={project.links ?? []} />

      <AutoStatus cache={project.github_cache ?? null} />

      <NotesLog
        projectId={project.id}
        notes={project.project_notes ?? []}
        profiles={allProfiles}
      />
    </div>
  )
}
```

- [ ] **Step 9: Verify the project detail page**

Run: `npm run dev`
Create a test project, then navigate to its detail page.
Expected: All sections render — header with pin/stage, summary, next step, task list, key links, auto status, notes.

- [ ] **Step 10: Commit**

```bash
git add app/projects/[id]/ components/project-detail/ lib/mutations/notes.ts
git commit -m "feat: build Project Detail page with tasks, links, status, notes"
```

---

## Phase 2 Complete Checklist

- [ ] Data query functions for projects, tasks, personal tasks
- [ ] Client-side mutation functions for CRUD operations
- [ ] Home screen with Your Next 3, Focus Projects, Quick Actions
- [ ] All Projects page with GTD stage filtering, search, create, triage
- [ ] Project Detail page with all 7 sections
- [ ] App builds and runs without errors

**Next phase:** Phase 3 — Supporting Pages (Resources, Activity Log, Settings, Leads)
