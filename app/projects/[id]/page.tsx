import { notFound } from 'next/navigation'
import { getProject } from '@/lib/queries/projects'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Task, ProjectNote } from '@/lib/types/database'
import ProjectHeader from '@/components/project-detail/ProjectHeader'
import ProjectSummary from '@/components/project-detail/ProjectSummary'
import TaskList from '@/components/project-detail/TaskList'
import KeyLinks from '@/components/project-detail/KeyLinks'
import AutoStatus from '@/components/project-detail/AutoStatus'
import NotesLog from '@/components/project-detail/NotesLog'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [project, profiles] = await Promise.all([
    getProject(id),
    fetchProfiles(),
  ])

  if (!project) {
    notFound()
  }

  const allTasks = (project.tasks ?? []) as Task[]
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  // Sort: next step first (uncompleted), then by sort_order, completed last
  const sortedTasks = [...allTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.is_next_step !== b.is_next_step) return a.is_next_step ? -1 : 1
    return a.sort_order - b.sort_order
  })

  const nextStep = allTasks.find((t) => t.is_next_step && !t.completed) ?? null
  const nextStepAssignee = nextStep?.assigned_to
    ? profileMap.get(nextStep.assigned_to)?.name ?? null
    : null

  const links = project.links ?? []
  const githubCache = project.github_cache ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = ((project as any).project_notes ?? []) as ProjectNote[]

  return (
    <div className="min-h-screen p-4 pb-24" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="max-w-lg mx-auto md:max-w-2xl">
        <ProjectHeader project={project} />

        <ProjectSummary projectId={project.id} summary={project.summary} />

        {nextStep && (
          <div className="rounded-xl border border-[#D4A853]/30 bg-[#D4A853]/10 p-4 mb-4">
            <div className="flex items-start gap-2">
              <span className="text-[#D4A853] font-bold text-lg leading-none mt-0.5">&rarr;</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#2C3E50]">{nextStep.title}</p>
                {nextStepAssignee && (
                  <p className="text-xs text-[#8899a6] mt-0.5">
                    Assigned to {nextStepAssignee}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <TaskList projectId={project.id} tasks={sortedTasks} profiles={profiles} />

        <KeyLinks links={links} />

        <AutoStatus cache={githubCache} />

        <NotesLog projectId={project.id} notes={notes} profiles={profiles} />
      </div>
    </div>
  )
}

async function fetchProfiles(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('*')
  if (error) throw error
  return (data ?? []) as Profile[]
}
