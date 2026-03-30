import { createClient } from '@/lib/supabase/server'
import type { Stage, ProjectWithDetails, Project, Task } from '@/lib/types/database'

export async function getProjects(stage?: Stage): Promise<ProjectWithDetails[]> {
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('*')
    .neq('stage', 'archived')
    .order('updated_at', { ascending: false })

  if (stage) {
    query = query.eq('stage', stage)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as ProjectWithDetails[]
}

export async function getPinnedProjects(): Promise<ProjectWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks (*),
      project_links (*),
      github_cache (*)
    `)
    .eq('pinned', true)
    .neq('stage', 'archived')
    .order('updated_at', { ascending: false })
    .limit(3)

  if (error) throw error

  return ((data ?? []) as (ProjectWithDetails & {
    tasks: NonNullable<ProjectWithDetails['tasks']>
    project_links: NonNullable<ProjectWithDetails['links']>
    github_cache: unknown[]
  })[]).map((project) => {
    const { project_links, github_cache, tasks, ...rest } = project
    return {
      ...rest,
      tasks,
      links: project_links,
      next_step: tasks?.find((t) => t.is_next_step && !t.completed) ?? null,
      github_cache: Array.isArray(github_cache) && github_cache.length > 0
        ? github_cache[0]
        : null,
    } as ProjectWithDetails
  })
}

export async function getProject(id: string): Promise<ProjectWithDetails | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      tasks (*),
      project_links (*),
      project_notes (*),
      github_cache (*),
      leads (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  if (!data) return null

  const { project_links, github_cache, tasks, ...rest } = data as ProjectWithDetails & {
    project_links: NonNullable<ProjectWithDetails['links']>
    github_cache: unknown[]
    tasks: NonNullable<ProjectWithDetails['tasks']>
  }

  return {
    ...rest,
    tasks,
    links: project_links,
    next_step: tasks?.find((t) => t.is_next_step && !t.completed) ?? null,
    github_cache: Array.isArray(github_cache) && github_cache.length > 0
      ? github_cache[0]
      : null,
  } as ProjectWithDetails
}

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

export async function getProjectCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('projects')
    .select('stage')
    .neq('stage', 'archived')

  if (error) throw error

  const counts: Record<string, number> = { all: 0 }

  for (const row of data ?? []) {
    counts.all++
    counts[row.stage] = (counts[row.stage] ?? 0) + 1
  }

  return counts
}
