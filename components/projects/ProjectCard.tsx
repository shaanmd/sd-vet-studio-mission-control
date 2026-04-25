// components/projects/ProjectCard.tsx
import Link from 'next/link'
import type { Project, Task } from '@/lib/types/database'

const STAGE_PILLS: Record<string, { bg: string; color: string }> = {
  inbox:       { bg: '#EEE8F6', color: '#6B4E94' },
  someday:     { bg: '#E5EEF7', color: '#3A6C98' },
  exploring:   { bg: '#E5EEF7', color: '#3A6C98' },
  building:    { bg: '#F5E7C8', color: '#8A5A1E' },
  live:        { bg: '#D4F0EE', color: '#1E6B5E' },
  maintenance: { bg: '#EFEAE0', color: '#6B7A82' },
}

interface Props {
  project: Project
  nextStep?: Task | null
}

export default function ProjectCard({ project, nextStep }: Props) {
  const pill = STAGE_PILLS[project.stage] ?? STAGE_PILLS.inbox

  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl p-3.5 transition-shadow hover:shadow-sm"
      style={{
        background: '#fff',
        border: nextStep ? '1px solid #EFDDB0' : '1px solid #E8E2D6',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-xl leading-none">{project.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold truncate" style={{ color: '#0D2035' }}>
            {project.name}
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
          style={{ background: pill.bg, color: pill.color }}
        >
          {project.stage}
        </span>
      </div>

      {/* Next step */}
      {nextStep ? (
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-2"
          style={{ background: '#FBF3DE', border: '1px solid #EFDDB0' }}
        >
          <span className="font-bold" style={{ color: '#D4A853' }}>→</span>
          <span className="flex-1 text-[12.5px] font-semibold truncate" style={{ color: '#0D2035' }}>
            {nextStep.title}
          </span>
        </div>
      ) : (
        <div
          className="rounded-lg px-2.5 py-2 text-[12px] italic"
          style={{ border: '1.5px dashed #CDC3AE', color: '#9AA5AC' }}
        >
          No next step set · add one
        </div>
      )}
    </Link>
  )
}
