import { createClient } from '@/lib/supabase/client'
import type { Stage, Project } from '@/lib/types/database'

export async function createProject(input: {
  name: string
  summary?: string
  stage?: Stage
  emoji?: string
  created_by: string
}): Promise<Project> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      summary: input.summary ?? null,
      stage: input.stage ?? 'inbox',
      emoji: input.emoji ?? null,
      created_by: input.created_by,
    })
    .select()
    .single()

  if (error) throw error
  return data as Project
}

export async function updateProjectStage(
  id: string,
  stage: Stage,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('projects')
    .update({ stage, updated_by: userId })
    .eq('id', id)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function toggleProjectPin(
  id: string,
  pinned: boolean,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('projects')
    .update({ pinned, updated_by: userId })
    .eq('id', id)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function updateProjectName(
  id: string,
  name: string,
  emoji: string | null,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('projects')
    .update({ name, emoji, updated_by: userId })
    .eq('id', id)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function updateProjectSummary(
  id: string,
  summary: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('projects')
    .update({ summary, updated_by: userId })
    .eq('id', id)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}
