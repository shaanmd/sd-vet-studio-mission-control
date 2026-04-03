import { createClient } from '@/lib/supabase/client'
import type { Stage, Project, RevenueScore, RevenueStream } from '@/lib/types/database'

export async function createProject(input: {
  name: string
  summary?: string
  stage?: Stage
  emoji?: string
  revenue_score?: RevenueScore
  revenue_stream?: RevenueStream
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
      revenue_score: input.revenue_score ?? 'medium',
      revenue_stream: input.revenue_stream ?? null,
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

export async function updateProject(id: string, values: Partial<Project>): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('projects')
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}

export async function saveProjectAnalysis(values: {
  project_id: string
  income_potential: string
  build_difficulty: string
  recommendation: string
  raw_output: string
  analysed_by: string
}): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('project_analysis')
    .upsert({ ...values, analysed_at: new Date().toISOString() }, { onConflict: 'project_id' })

  if (error) {
    console.error('[supabase mutation error]', error)
    throw error
  }
}
