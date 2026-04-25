import Link from 'next/link'
import type { ProjectWithDetails } from '@/lib/types/database'

interface FocusProjectsProps {
  projects: ProjectWithDetails[]
}

const STAGE_PILLS: Record<string, { bg: string; color: string }> = {
  inbox:       { bg: '#EEE8F6', color: '#6B4E94' },
  someday:     { bg: '#E5EEF7', color: '#3A6C98' },
  exploring:   { bg: '#E5EEF7', color: '#3A6C98' },
  building:    { bg: '#F5E7C8', color: '#8A5A1E' },
  live:        { bg: '#D4F0EE', color: '#1E6B5E' },
  maintenance: { bg: '#EFEAE0', color: '#6B7A82' },
}

export default function FocusProjects({ projects }: FocusProjectsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="text-[10.5px] font-bold uppercase tracking-[1.6px]"
        style={{ color: '#6B7A82' }}
      >
        Focus projects · {projects.length} pinned
      </div>

      {projects.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center text-[13px]"
          style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#9AA5AC' }}
        >
          No pinned projects yet. Pin up to 3 from your project list.
        </div>
      ) : (
        projects.map((project) => {
          const pill = STAGE_PILLS[project.stage] ?? STAGE_PILLS.inbox
          const hasNext = !!project.next_step

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-xl p-3.5 transition-shadow hover:shadow-sm"
              style={{
                background: '#fff',
                border: hasNext ? '1px solid #EFDDB0' : '1px solid #E8E2D6',
              }}
            >
              {/* Header row */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-xl leading-none">{project.emoji}</span>
                <div className="flex-1 text-[14px] font-bold truncate" style={{ color: '#0D2035' }}>
                  {project.name}
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
                  style={{ background: pill.bg, color: pill.color }}
                >
                  {project.stage}
                </span>
              </div>

              {/* Next step card */}
              {hasNext ? (
                <div
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                  style={{ background: '#FBF3DE', border: '1px solid #EFDDB0' }}
                >
                  <span className="font-bold" style={{ color: '#D4A853' }}>→</span>
                  <span className="flex-1 text-[12.5px] font-semibold truncate" style={{ color: '#0D2035' }}>
                    {project.next_step!.title}
                  </span>
                </div>
              ) : (
                <div
                  className="rounded-lg px-2.5 py-2 text-[12px] italic"
                  style={{
                    border: '1.5px dashed #CDC3AE',
                    color: '#9AA5AC',
                  }}
                >
                  No next step set · add one
                </div>
              )}
            </Link>
          )
        })
      )}
    </div>
  )
}
