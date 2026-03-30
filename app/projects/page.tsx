import { getProjectsWithNextStep, getProjectCounts } from '@/lib/queries/projects'
import ProjectList from '@/components/projects/ProjectList'

export default async function ProjectsPage() {
  const [projects, counts] = await Promise.all([
    getProjectsWithNextStep(),
    getProjectCounts(),
  ])

  return (
    <div className="min-h-screen p-4 pb-24" style={{ backgroundColor: '#F5F0E8' }}>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2C3E50]">All Projects</h1>
        <p className="text-xs text-[#8899a6]">
          {counts.all ?? 0} project{(counts.all ?? 0) !== 1 ? 's' : ''}
        </p>
      </div>

      <ProjectList projects={projects} counts={counts} />
    </div>
  )
}
