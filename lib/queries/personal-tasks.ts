import { createClient } from '@/lib/supabase/server'
import type { PersonalTaskWithProject } from '@/lib/types/database'

export interface NextStepTask {
  id: string
  title: string
  project_id: string
  energy: string | null
  is_next_step: boolean
  project: { id: string; name: string; emoji: string | null } | null
}

export async function getNextStepTasks(userId: string): Promise<NextStepTask[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, project_id, energy, is_next_step, project:projects(id, name, emoji)')
    .eq('assigned_to', userId)
    .eq('is_next_step', true)
    .eq('completed', false)
    .limit(3)
  if (error) throw error
  return (data ?? []) as unknown as NextStepTask[]
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
