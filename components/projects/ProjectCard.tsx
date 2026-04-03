// components/projects/ProjectCard.tsx
import Link from 'next/link'
import type { Project, Task } from '@/lib/types/database'

const REVENUE_EMOJI: Record<string, string> = { high: '💰💰💰', medium: '💰💰', low: '💰' }
const STAGE_COLORS: Record<string, string> = {
  inbox: 'bg-gray-100 text-gray-600',
  someday: 'bg-purple-100 text-purple-600',
  exploring: 'bg-blue-100 text-blue-700',
  building: 'bg-orange-100 text-orange-700',
  live: 'bg-green-100 text-green-700',
  maintenance: 'bg-teal-100 text-teal-700',
}

interface Props {
  project: Project
  nextStep?: Task | null
}

export default function ProjectCard({ project, nextStep }: Props) {
  return (
    <Link href={`/projects/${project.id}`} className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{project.emoji}</span>
          <span className="font-semibold text-gray-800 truncate">{project.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-sm">{REVENUE_EMOJI[project.revenue_score ?? 'low']}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[project.stage] ?? 'bg-gray-100 text-gray-600'}`}>
            {project.stage}
          </span>
        </div>
      </div>
      {nextStep && (
        <div className="text-xs text-teal-700 font-medium truncate">
          → {nextStep.title}
        </div>
      )}
      {!nextStep && (
        <div className="text-xs text-gray-400">No next step set</div>
      )}
    </Link>
  )
}
