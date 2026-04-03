import { getProjectsWithNextStep } from '@/lib/queries/projects'
import ProjectCard from '@/components/projects/ProjectCard'
import StageFilterPills from '@/components/projects/StageFilterPills'
import ProjectsClientWrapper from '@/components/projects/ProjectsClientWrapper'

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string }>
}) {
  const params = await searchParams
  const projects = await getProjectsWithNextStep()
  const stage = params.stage

  const filtered = stage ? projects.filter(p => p.stage === stage) : projects

  const counts: Record<string, number> = { all: projects.length }
  for (const p of projects) {
    counts[p.stage] = (counts[p.stage] ?? 0) + 1
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">
          📂 Projects <span className="text-gray-400 font-normal text-base">({projects.length})</span>
        </h1>
        <ProjectsClientWrapper />
      </div>
      <div className="mb-4">
        <StageFilterPills counts={counts} />
      </div>
      <div className="flex flex-col gap-3">
        {filtered.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            nextStep={project.next_step ?? null}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">No projects in this stage.</p>
        )}
      </div>
    </div>
  )
}
