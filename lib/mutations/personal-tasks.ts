import { createClient } from '@/lib/supabase/client'
import type { Energy } from '@/lib/types/database'

export async function createPersonalTask(input: {
  title: string
  owner_id: string
  project_id?: string
  energy?: Energy
}): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('personal_tasks')
    .insert({
      title: input.title,
      owner_id: input.owner_id,
      project_id: input.project_id ?? null,
      energy: input.energy ?? null,
    })

  if (error) throw error
}

export async function completePersonalTask(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('personal_tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}
