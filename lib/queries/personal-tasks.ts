import { createClient } from '@/lib/supabase/server'
import type { PersonalTaskWithProject } from '@/lib/types/database'

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
