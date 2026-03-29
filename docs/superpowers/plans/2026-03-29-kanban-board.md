# Kanban Board View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Kanban board view to the All Projects page with drag-and-drop stage changes and an undo toast.

**Architecture:** The existing `/projects` page gets a list/board toggle. Board view uses `@dnd-kit/core` for drag-and-drop across 4 stage columns (Exploring, Building, Live, Maintenance). Cards show project name, next step, and assignee. Dropping a card in a new column calls `updateProjectStage()` and shows an undo toast. The page query is updated to include tasks for next-step display.

**Tech Stack:** Next.js 16, Tailwind CSS 4, TypeScript, Supabase, @dnd-kit/core, @dnd-kit/sortable

**Spec:** `docs/superpowers/specs/2026-03-29-kanban-board-design.md`

---

### Task 1: Install dnd-kit and update project query

**Files:**
- Modify: `package.json` (install @dnd-kit/core, @dnd-kit/sortable)
- Modify: `lib/queries/projects.ts` (add getProjectsWithNextStep)
- Modify: `app/projects/page.tsx` (use new query)

- [ ] **Step 1: Install @dnd-kit packages**

```bash
npm install @dnd-kit/core @dnd-kit/sortable
```

- [ ] **Step 2: Add getProjectsWithNextStep query**

Add to `lib/queries/projects.ts`:
```typescript
export async function getProjectsWithNextStep(): Promise<ProjectWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('*, tasks(*)')
    .neq('stage', 'archived')
    .order('updated_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as (Project & { tasks: Task[] })[]).map((project) => {
    const { tasks, ...rest } = project
    return {
      ...rest,
      tasks,
      next_step: tasks?.find((t) => t.is_next_step && !t.completed) ?? null,
    } as ProjectWithDetails
  })
}
```

Also add `Task` to the import:
```typescript
import type { Stage, ProjectWithDetails, Task } from '@/lib/types/database'
```

- [ ] **Step 3: Update projects page to use new query**

Replace `app/projects/page.tsx`:
```tsx
import { getProjectsWithNextStep, getProjectCounts } from '@/lib/queries/projects'
import ProjectList from '@/components/projects/ProjectList'

export default async function ProjectsPage() {
  const [projects, counts] = await Promise.all([
    getProjectsWithNextStep(),
    getProjectCounts(),
  ])

  return (
    <div className="min-h-screen p-4 pb-24" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2C3E50]">All Projects</h1>
        <p className="text-xs text-[#8899a6]">
          {counts.all ?? 0} project{(counts.all ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <ProjectList projects={projects} counts={counts} />
    </div>
  )
}
```

- [ ] **Step 4: Verify build passes**

```bash
npx next build
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/queries/projects.ts app/projects/page.tsx
git commit -m "feat: install dnd-kit and add project query with tasks join"
```

---

### Task 2: View Toggle component

**Files:**
- Create: `components/projects/ViewToggle.tsx`

- [ ] **Step 1: Create the ViewToggle component**

Create `components/projects/ViewToggle.tsx`:
```tsx
'use client'

interface ViewToggleProps {
  view: 'list' | 'board'
  onToggle: (view: 'list' | 'board') => void
}

export default function ViewToggle({ view, onToggle }: ViewToggleProps) {
  return (
    <div className="flex bg-[#F5F0E8] rounded-lg p-0.5">
      <button
        onClick={() => onToggle('list')}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          view === 'list'
            ? 'bg-white text-[#2C3E50] shadow-sm'
            : 'text-[#8899a6]'
        }`}
      >
        List
      </button>
      <button
        onClick={() => onToggle('board')}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          view === 'board'
            ? 'bg-white text-[#2C3E50] shadow-sm'
            : 'text-[#8899a6]'
        }`}
      >
        Board
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/projects/ViewToggle.tsx
git commit -m "feat: add list/board view toggle component"
```

---

### Task 3: Undo Toast component

**Files:**
- Create: `components/projects/UndoToast.tsx`

- [ ] **Step 1: Create the UndoToast component**

Create `components/projects/UndoToast.tsx`:
```tsx
'use client'

import { useEffect } from 'react'

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export default function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#2C3E50] text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-sm">
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="font-semibold text-[#D4A853] hover:text-[#e8c06a] transition-colors"
      >
        Undo
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/projects/UndoToast.tsx
git commit -m "feat: add undo toast component with auto-dismiss"
```

---

### Task 4: Kanban Card component

**Files:**
- Create: `components/projects/KanbanCard.tsx`

- [ ] **Step 1: Create the KanbanCard component**

Create `components/projects/KanbanCard.tsx`:
```tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { ProjectWithDetails } from '@/lib/types/database'

interface KanbanCardProps {
  project: ProjectWithDetails
}

export default function KanbanCard({ project }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const nextStep = project.next_step

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-3 border cursor-grab active:cursor-grabbing ${
        project.pinned
          ? 'border-l-[3px] border-l-[#D4A853] border-t border-r border-b border-black/[0.06]'
          : 'border-black/[0.06]'
      } ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
      {...attributes}
      {...listeners}
    >
      <Link
        href={`/projects/${project.id}`}
        onClick={(e) => {
          // Prevent navigation when dragging
          if (isDragging) e.preventDefault()
        }}
        className="block"
      >
        <div className="text-[13px] font-semibold text-[#2C3E50] truncate">
          {project.emoji && <span className="mr-1">{project.emoji}</span>}
          {project.name}
        </div>
        {nextStep ? (
          <div className="text-[11px] text-[#D4A853] mt-1 truncate">
            &rarr; {nextStep.title}
          </div>
        ) : (
          <div className="text-[11px] text-[#8899a6] mt-1 italic">
            No next step
          </div>
        )}
        {nextStep?.assigned_to && (
          <div className="text-[10px] text-[#8899a6] mt-0.5">
            {nextStep.assigned_to}
          </div>
        )}
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/projects/KanbanCard.tsx
git commit -m "feat: add draggable Kanban card component"
```

---

### Task 5: Kanban Column component

**Files:**
- Create: `components/projects/KanbanColumn.tsx`

- [ ] **Step 1: Create the KanbanColumn component**

Create `components/projects/KanbanColumn.tsx`:
```tsx
'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ProjectWithDetails, Stage } from '@/lib/types/database'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  stage: Stage
  icon: string
  label: string
  projects: ProjectWithDetails[]
}

export default function KanbanColumn({ stage, icon, label, projects }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex-1 min-w-[200px]">
      <div className="text-[10px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2 flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{label}</span>
        <span className="text-[#8899a6] font-normal">({projects.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[120px] rounded-xl p-2 transition-colors space-y-2 ${
          isOver ? 'bg-[#1E6B5E]/5 ring-2 ring-[#1E6B5E]/20' : 'bg-black/[0.02]'
        }`}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <KanbanCard key={project.id} project={project} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/projects/KanbanColumn.tsx
git commit -m "feat: add droppable Kanban column component"
```

---

### Task 6: Kanban Board component

**Files:**
- Create: `components/projects/KanbanBoard.tsx`

- [ ] **Step 1: Create the KanbanBoard component**

Create `components/projects/KanbanBoard.tsx`:
```tsx
'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { updateProjectStage } from '@/lib/mutations/projects'
import type { ProjectWithDetails, Stage } from '@/lib/types/database'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import UndoToast from './UndoToast'

const BOARD_COLUMNS: { stage: Stage; icon: string; label: string }[] = [
  { stage: 'exploring', icon: '\uD83D\uDD0D', label: 'Exploring' },
  { stage: 'building', icon: '\uD83D\uDD28', label: 'Building' },
  { stage: 'live', icon: '\uD83D\uDFE2', label: 'Live' },
  { stage: 'maintenance', icon: '\uD83D\uDD27', label: 'Maintenance' },
]

interface KanbanBoardProps {
  projects: ProjectWithDetails[]
}

export default function KanbanBoard({ projects }: KanbanBoardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    projectId: string
    previousStage: Stage
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const activeProject = activeId
    ? projects.find((p) => p.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || !user) return

    const projectId = active.id as string
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    // The "over" target is the column's droppable ID (the stage name)
    const targetStage = over.id as Stage
    // If dropped on a card, find which column that card belongs to
    const targetProject = projects.find((p) => p.id === targetStage)
    const newStage = targetProject ? targetProject.stage : targetStage

    // Validate it's a board column stage
    if (!BOARD_COLUMNS.some((c) => c.stage === newStage)) return
    if (newStage === project.stage) return

    const previousStage = project.stage
    const columnMeta = BOARD_COLUMNS.find((c) => c.stage === newStage)

    try {
      await updateProjectStage(projectId, newStage, user.id)

      setToast({
        message: `Moved "${project.name}" to ${columnMeta?.label ?? newStage}`,
        projectId,
        previousStage,
      })

      router.refresh()
    } catch {
      alert('Failed to move project.')
    }
  }

  const handleUndo = useCallback(async () => {
    if (!toast || !user) return
    try {
      await updateProjectStage(toast.projectId, toast.previousStage, user.id)
      setToast(null)
      router.refresh()
    } catch {
      alert('Failed to undo.')
    }
  }, [toast, user, router])

  const handleDismissToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              icon={col.icon}
              label={col.label}
              projects={projects.filter((p) => p.stage === col.stage)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProject ? (
            <div className="rotate-2 opacity-90">
              <KanbanCard project={activeProject} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}
    </>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add components/projects/KanbanBoard.tsx
git commit -m "feat: add Kanban board with drag-and-drop and undo toast"
```

---

### Task 7: Wire up view toggle in ProjectList

**Files:**
- Modify: `components/projects/ProjectList.tsx`

- [ ] **Step 1: Add view toggle and board rendering to ProjectList**

In `components/projects/ProjectList.tsx`, add imports at the top:
```tsx
import ViewToggle from './ViewToggle'
import KanbanBoard from './KanbanBoard'
import type { ProjectWithDetails } from '@/lib/types/database'
```

Update the props interface:
```tsx
interface ProjectListProps {
  projects: ProjectWithDetails[]
  counts: Record<string, number>
}
```

Add view state after the existing `useState` declarations:
```tsx
const [view, setView] = useState<'list' | 'board'>('list')
```

Add the ViewToggle to the search bar area. Replace the existing search + New button `div`:
```tsx
{/* Search + Toggle + New button */}
<div className="flex gap-2 items-center">
  <div className="relative flex-1">
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899a6]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search projects..."
      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-black/8 bg-white text-[#2C3E50] placeholder:text-[#8899a6]/60 focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]/30 focus:border-[#1E6B5E]"
    />
  </div>
  <ViewToggle view={view} onToggle={setView} />
  <button
    onClick={() => setShowCreate(true)}
    className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
    style={{ backgroundColor: '#1E6B5E' }}
  >
    + New
  </button>
</div>
```

After the StageFilter, add conditional rendering. Replace the project groups section:
```tsx
{view === 'board' ? (
  <KanbanBoard projects={filtered as ProjectWithDetails[]} />
) : (
  <>
    {/* Existing list view code (grouped.length === 0 check and groups map) */}
    {grouped.length === 0 ? (
      <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
        <p className="text-sm text-[#8899a6]">
          {search.trim() ? 'No projects match your search.' : 'No projects yet.'}
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {/* ... existing grouped list rendering ... */}
      </div>
    )}
  </>
)}
```

Note: Keep all existing list rendering code intact — only wrap it in the `view === 'board'` conditional.

- [ ] **Step 2: Verify the app builds**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add components/projects/ProjectList.tsx
git commit -m "feat: add list/board toggle to All Projects page"
```

---

## Kanban Board Complete Checklist

- [ ] @dnd-kit installed and project query updated with tasks join
- [ ] ViewToggle component (list/board pill)
- [ ] UndoToast component (auto-dismiss, undo action)
- [ ] KanbanCard component (draggable, shows next step)
- [ ] KanbanColumn component (droppable, stage header)
- [ ] KanbanBoard component (DndContext, drag handling, undo)
- [ ] ProjectList wired up with view toggle and board rendering
- [ ] App builds and runs without errors
