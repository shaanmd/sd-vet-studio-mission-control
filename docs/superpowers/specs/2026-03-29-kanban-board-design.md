# Kanban Board View — Design Spec

## Overview

Add a Kanban board view to the All Projects page (`/projects`). Users toggle between List (existing) and Board views. The board displays projects as draggable cards across stage columns, giving a visual overview of the project pipeline.

## Scope

- Board view on `/projects` with list/board toggle
- 4 columns: Exploring, Building, Live, Maintenance
- Drag-and-drop between columns changes project stage
- Undo toast after drag
- Projects in Inbox/Someday/Archived only visible in List view

Out of scope: task due dates, personal tasks, Gantt charts.

## Design Decisions

### View Toggle
A pill toggle in the header area (next to search + New button): `List | Board`. Default view is List (preserves existing behaviour). Selection persists via `useState` only (no URL param needed).

### Board Columns
Four columns in order: **Exploring → Building → Live → Maintenance**. Each column shows:
- Stage icon + label + count in header
- Project cards stacked vertically
- Columns scroll vertically if many cards; board scrolls horizontally on mobile

### Card Content
Each card shows:
- Project emoji + name (bold)
- Next step text in gold (`→ task title`) or italic "No next step" in grey
- Assignee name (if next step has one)
- Pinned projects get a gold left border accent

Tapping a card navigates to `/projects/[id]`.

### Drag-and-Drop
- Drag a card from one column to another to change its stage
- On drop: stage updates immediately via `updateProjectStage()`, then `router.refresh()`
- A toast notification appears: "Moved [name] to [stage] — Undo" with 4-second auto-dismiss
- Undo reverts the stage change
- Library: `@dnd-kit/core` + `@dnd-kit/sortable` (lightweight, accessible, React-native)

### Mobile Behaviour
- Columns display in a horizontally scrollable container
- Each column has `min-width: 200px`
- Touch drag supported by dnd-kit

### Data Requirements
The board needs the same data as the list view (`projects` with `tasks` joined for next step). The `getProjects()` query needs to include tasks for next-step display. Currently it only fetches `*` without joins.

Updated query for board view:
```typescript
export async function getProjectsWithNextStep(): Promise<ProjectWithDetails[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, tasks(*)')
    .neq('stage', 'archived')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(project => ({
    ...project,
    tasks: project.tasks,
    next_step: project.tasks?.find(t => t.is_next_step && !t.completed) ?? null,
  })) as ProjectWithDetails[]
}
```

## Components

### New Files
- `components/projects/KanbanBoard.tsx` — the board view (client component)
- `components/projects/KanbanCard.tsx` — individual project card
- `components/projects/KanbanColumn.tsx` — single stage column
- `components/projects/ViewToggle.tsx` — list/board toggle pill
- `components/projects/UndoToast.tsx` — toast with undo action

### Modified Files
- `app/projects/page.tsx` — pass tasks data, add view toggle
- `lib/queries/projects.ts` — add `getProjectsWithNextStep()`
- `components/projects/ProjectList.tsx` — accept view mode, render board or list

## Tech Stack
- `@dnd-kit/core` — drag-and-drop primitives
- `@dnd-kit/sortable` — sortable containers
- Existing: Next.js 16, Tailwind CSS 4, Supabase
