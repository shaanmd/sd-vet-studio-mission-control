import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Energy } from '@/lib/types/database'

export async function applyTaskPatch(
  supabase: SupabaseClient,
  taskId: string,
  body: Record<string, unknown>
): Promise<{ error: string | null }> {
  if (body.is_next_step === true) {
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', taskId)
      .single()

    if (fetchError) return { error: fetchError.message }

    const { error: clearError } = await supabase
      .from('tasks')
      .update({ is_next_step: false })
      .eq('project_id', task.project_id)

    if (clearError) return { error: clearError.message }

    const { error: setError } = await supabase
      .from('tasks')
      .update({ is_next_step: true })
      .eq('id', taskId)

    return { error: setError?.message ?? null }
  }

  const { error } = await supabase
    .from('tasks')
    .update(body)
    .eq('id', taskId)

  return { error: error?.message ?? null }
}

export async function createTask(input: {
  project_id: string
  title: string
  assigned_to?: string
  is_shared?: boolean
  energy?: Energy
}): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .insert({
      project_id: input.project_id,
      title: input.title,
      assigned_to: input.assigned_to ?? null,
      is_shared: input.is_shared ?? false,
      energy: input.energy ?? null,
    })

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function completeTask(id: string, completedBy: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      completed_by: completedBy,
    })
    .eq('id', id)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function assignTask(taskId: string, assignedTo: string | null): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('tasks')
    .update({ assigned_to: assignedTo })
    .eq('id', taskId)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function setNextStep(projectId: string, taskId: string): Promise<void> {
  const supabase = createClient()

  // Clear existing is_next_step on all tasks in the project
  const { error: clearError } = await supabase
    .from('tasks')
    .update({ is_next_step: false })
    .eq('project_id', projectId)
    .eq('is_next_step', true)

  if (clearError) throw clearError

  // Set the new next step
  const { error: setError } = await supabase
    .from('tasks')
    .update({ is_next_step: true })
    .eq('id', taskId)

  if (setError) throw setError
}
