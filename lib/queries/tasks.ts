import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types/database'

export async function getProjectTasks(projectId: string): Promise<Task[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('completed', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as Task[]
}
