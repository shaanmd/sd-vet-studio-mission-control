'use client'
import Link from 'next/link'
import type { ProjectWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

const STAGE_PILLS: Record<string, { bg: string; color: string }> = {
  inbox:       { bg: '#EEE8F6', color: '#6B4E94' },
  someday:     { bg: '#E5EEF7', color: '#3A6C98' },
  exploring:   { bg: '#E5EEF7', color: '#3A6C98' },
  building:    { bg: '#F5E7C8', color: '#8A5A1E' },
  live:        { bg: '#D4F0EE', color: '#1E6B5E' },
  maintenance: { bg: '#EFEAE0', color: '#6B7A82' },
}

const COLS = '32px 2fr 120px 2fr 56px 90px 90px'

function OwnerAvatar({ who }: { who: 'Deb' | 'Shaan' | null }) {
  if (!who) return <span style={{ color: '#9AA5AC' }}>—</span>
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
      style={
        who === 'Shaan'
          ? { background: '#E8F1EE', color: '#1E6B5E' }
          : { background: '#EEE8F6', color: '#7B5EA8' }
      }
    >
      {who.charAt(0)}
    </div>
  )
}

interface Props {
  projects: ProjectWithDetails[]
  revenueByProject: Record<string, number>
  ownerByProject: Record<string, 'Deb' | 'Shaan' | null>
}

export default function ProjectsTable({ projects, revenueByProject, ownerByProject }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
      {/* Header */}
      <div
        className="grid items-center px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[1.2px]"
        style={{
          gridTemplateColumns: COLS,
          gap: 10,
          background: '#FBF7EF',
          borderBottom: '1px solid #E8E2D6',
          color: '#6B7A82',
        }}
      >
        <div />
        <div>Project</div>
        <div>Stage</div>
        <div>Next step</div>
        <div>Owner</div>
        <div>Rev</div>
        <div>Touched</div>
      </div>

      {/* Rows */}
      {projects.map((p, i) => {
        const pill = STAGE_PILLS[p.stage] ?? STAGE_PILLS.inbox
        const rev = revenueByProject[p.id] ?? 0
        const owner = ownerByProject[p.id] ?? null
        const touched = p.updated_at ? formatDistanceToNow(p.updated_at) : '—'

        return (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="grid items-center px-4 py-3 transition-colors"
            style={{
              gridTemplateColumns: COLS,
              gap: 10,
              background: p.pinned ? '#FDFAF2' : '#fff',
              borderBottom: i < projects.length - 1 ? '1px solid #EFEAE0' : 'none',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FDFAF2' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = p.pinned ? '#FDFAF2' : '#fff' }}
          >
            {/* Emoji */}
            <span className="text-lg leading-none">{p.emoji}</span>

            {/* Name */}
            <div className="flex items-center gap-1.5 min-w-0">
              {p.pinned && <span className="text-sm shrink-0">📌</span>}
              <span
                className="text-[13.5px] font-bold truncate"
                style={{ color: '#0D2035' }}
              >
                {p.name}
              </span>
            </div>

            {/* Stage */}
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold w-fit"
              style={{ background: pill.bg, color: pill.color }}
            >
              {p.stage}
            </span>

            {/* Next step */}
            <div className="min-w-0">
              {p.next_step ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-[12px] shrink-0" style={{ color: '#D4A853' }}>→</span>
                  <span
                    className="text-[12.5px] font-semibold truncate"
                    style={{ color: '#0D2035' }}
                  >
                    {p.next_step.title}
                  </span>
                </div>
              ) : (
                <span style={{ color: '#9AA5AC' }}>—</span>
              )}
            </div>

            {/* Owner */}
            <OwnerAvatar who={owner} />

            {/* Revenue */}
            <span
              className="text-[13px] font-bold tabular-nums"
              style={{ color: rev > 0 ? '#1E6B5E' : '#9AA5AC' }}
            >
              {rev > 0 ? fmt(rev) : '—'}
            </span>

            {/* Touched */}
            <span className="text-[12px]" style={{ color: '#6B7A82' }}>
              {touched} ago
            </span>
          </Link>
        )
      })}

      {projects.length === 0 && (
        <div className="py-12 text-center text-[13px]" style={{ color: '#9AA5AC' }}>
          No projects in this stage.
        </div>
      )}
    </div>
  )
}
