import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/utils/dates'
import type { ProjectWithDetails, Stage } from '@/lib/types/database'

interface FocusProjectsProps {
  projects: ProjectWithDetails[]
}

const stageColors: Record<string, string> = {
  building: '#1E6B5E',
  live: '#059669',
  exploring: '#b45309',
}
const defaultStageColor = '#8899a6'

function stageBadgeColor(stage: Stage): string {
  return stageColors[stage] ?? defaultStageColor
}

export default function FocusProjects({ projects }: FocusProjectsProps) {
  return (
    <section>
      <h2
        className="text-[11px] uppercase tracking-[2px] font-semibold mb-3"
        style={{ color: '#D4A853' }}
      >
        Focus Projects
      </h2>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/8 p-6 text-center">
          <p className="text-sm text-[#8899a6]">
            No pinned projects yet. Pin up to 3 from your project list.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const cache = project.github_cache
            const color = stageBadgeColor(project.stage)

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white rounded-xl border border-black/8 p-4 hover:shadow-sm transition-shadow"
              >
                {/* Header: emoji + name + stage badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-[#2C3E50]">
                    {project.emoji && `${project.emoji} `}
                    {project.name}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color,
                      backgroundColor: `${color}15`,
                    }}
                  >
                    {project.stage}
                  </span>
                </div>

                {/* Auto-status from github_cache */}
                {cache && (
                  <p className="text-xs text-[#8899a6] mb-1.5">
                    {cache.last_commit_at && (
                      <span>Last commit {formatDistanceToNow(cache.last_commit_at)}</span>
                    )}
                    {cache.deploy_status && (
                      <span>
                        {cache.last_commit_at ? ' · ' : ''}
                        Deploy: {cache.deploy_status}
                      </span>
                    )}
                  </p>
                )}

                {/* Next step */}
                {project.next_step && (
                  <p className="text-xs text-[#b45309]">
                    <span style={{ color: '#D4A853' }}>Next: </span>
                    {project.next_step.title}
                  </p>
                )}

                {/* Hint */}
                <p className="text-[10px] text-[#8899a6] mt-2">
                  Tap for full details &rarr;
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
