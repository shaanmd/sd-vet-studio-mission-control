import { createClient } from '@/lib/supabase/server'
import type { PersonalTaskWithProject } from '@/lib/types/database'

export interface NextStepTask {
  id: string
  title: string
  project_id: string
  energy: string | null
  is_next_step: boolean
  assigned_to: string | null
  project: { id: string; name: string; emoji: string | null } | null
}

// Fire-flagged tasks from active projects (live/beta/building + pinned).
// Both tabs share the same list — assignee filtering happens client-side via the tab toggle.
export async function getNextStepTasks(): Promise<NextStepTask[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, project_id, energy, is_next_step, assigned_to, project:projects(id, name, emoji, stage, pinned, updated_at)')
    .eq('is_next_step', true)
    .eq('completed', false)

  if (error) throw error

  const all = (data ?? []) as unknown as (NextStepTask & {
    project: { id: string; name: string; emoji: string | null; stage: string; pinned: boolean; updated_at: string } | null
  })[]

  const ACTIVE_STAGES = new Set(['live', 'beta', 'building'])

  return all
    .filter(t => t.project && (ACTIVE_STAGES.has(t.project.stage) || t.project.pinned))
    .sort((a, b) => {
      if (a.project?.pinned && !b.project?.pinned) return -1
      if (!a.project?.pinned && b.project?.pinned) return 1
      const aTime = a.project?.updated_at ? new Date(a.project.updated_at).getTime() : 0
      const bTime = b.project?.updated_at ? new Date(b.project.updated_at).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 10)
}

export async function getPersonalTasks(ownerId: string): Promise<PersonalTaskWithProject[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('personal_tasks')
    .select(`
      *,
      project:projects (id, name, emoji)
    `)
    .eq('owner_id', ownerId)
    .eq('completed', false)
    .order('sort_order', { ascending: true })
    .limit(3)

  if (error) throw error
  return (data ?? []) as PersonalTaskWithProject[]
}
