'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ProjectWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

const STREAM_LABELS: Record<string, string> = {
  course: '🎓 Course', subscription: '🔄 Sub', inapp: '📱 In-app',
  consulting: '💼 Consulting', website_builds: '🌐 Web builds',
  sponsorship: '🤝 Sponsor', affiliate: '🔗 Affiliate', other: '📦 Other',
}

const STAGE_PILLS: Record<string, { bg: string; color: string }> = {
  inbox:       { bg: '#EEE8F6', color: '#6B4E94' },
  someday:     { bg: '#E5EEF7', color: '#3A6C98' },
  exploring:   { bg: '#E5EEF7', color: '#3A6C98' },
  building:    { bg: '#F5E7C8', color: '#8A5A1E' },
  beta:        { bg: '#FDE8F7', color: '#8B2EB0' },
  live:        { bg: '#D4F0EE', color: '#1E6B5E' },
  maintenance: { bg: '#EFEAE0', color: '#6B7A82' },
  archived:    { bg: '#F3F4F6', color: '#9AA5AC' },
}

const STAGES = [
  { value: 'live',        label: '🟢 Live' },
  { value: 'beta',        label: '🧪 Beta' },
  { value: 'building',    label: '🔨 Building' },
  { value: 'exploring',   label: '🔍 Exploring' },
  { value: 'someday',     label: '💤 Someday' },
  { value: 'inbox',       label: '📥 Inbox' },
  { value: 'maintenance', label: '🔧 Maintenance' },
  { value: 'archived',    label: '📦 Archived' },
]

const COLS = '32px 2fr 140px 2fr 56px 90px 90px'

function OwnerAvatar({ who }: { who: 'Deb' | 'Shaan' | null }) {
  if (!who) return <span style={{ color: '#9AA5AC' }}>—</span>
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
      style={who === 'Shaan' ? { background: '#E8F1EE', color: '#1E6B5E' } : { background: '#EEE8F6', color: '#7B5EA8' }}
    >
      {who.charAt(0)}
    </div>
  )
}

function StageCell({ projectId, initialStage }: { projectId: string; initialStage: string }) {
  const router = useRouter()
  const [stage, setStage] = useState(initialStage)
  const [saving, setSaving] = useState(false)
  const pill = STAGE_PILLS[stage] ?? STAGE_PILLS.inbox

  async function handleChange(newStage: string) {
    setStage(newStage)
    setSaving(true)
    await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div onClick={e => e.preventDefault()} className="relative">
      <select
        value={stage}
        onChange={e => handleChange(e.target.value)}
        onClick={e => e.preventDefault()}
        className="appearance-none border-0 cursor-pointer rounded-full text-[11px] font-semibold px-2.5 py-1 pr-5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-opacity"
        style={{ background: pill.bg, color: pill.color, opacity: saving ? 0.6 : 1 }}
        title="Change stage"
      >
        {STAGES.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px]" style={{ color: pill.color }}>▾</span>
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
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
      {/* Header */}
      <div
        className="grid items-center px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[1.2px]"
        style={{ gridTemplateColumns: COLS, gap: 10, background: '#FBF7EF', borderBottom: '1px solid #E8E2D6', color: '#6B7A82' }}
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
        const rev = revenueByProject[p.id] ?? 0
        const owner = ownerByProject[p.id] ?? null
        const touched = p.updated_at ? formatDistanceToNow(p.updated_at) : '—'

        return (
          <div
            key={p.id}
            className="group grid items-center px-4 py-3 transition-colors"
            style={{
              gridTemplateColumns: COLS,
              gap: 10,
              background: p.pinned ? '#FDFAF2' : '#fff',
              borderBottom: i < projects.length - 1 ? '1px solid #EFEAE0' : 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FDFAF2' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = p.pinned ? '#FDFAF2' : '#fff' }}
          >
            {/* Emoji */}
            <Link href={`/projects/${p.id}`} className="text-lg leading-none">{p.emoji}</Link>

            {/* Name + summary */}
            <Link href={`/projects/${p.id}`} className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {p.pinned && <span className="text-sm shrink-0">📌</span>}
                <span className="text-[13.5px] font-bold truncate" style={{ color: '#0D2035' }}>{p.name}</span>
              </div>
              {p.summary && (
                <span className="text-[11.5px] truncate" style={{ color: '#9AA5AC' }}>{p.summary}</span>
              )}
              {p.revenue_stream && p.revenue_stream.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-0.5">
                  {p.revenue_stream.map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#6B7A82' }}>
                      {STREAM_LABELS[s] ?? s}
                    </span>
                  ))}
                </div>
              )}
            </Link>

            {/* Stage — inline dropdown */}
            <StageCell projectId={p.id} initialStage={p.stage} />

            {/* Next step */}
            <Link href={`/projects/${p.id}`} className="min-w-0">
              {p.next_step ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-bold text-[12px] shrink-0" style={{ color: '#D4A853' }}>→</span>
                  <span className="text-[12.5px] font-semibold truncate" style={{ color: '#0D2035' }}>{p.next_step.title}</span>
                </div>
              ) : (
                <span style={{ color: '#9AA5AC' }}>—</span>
              )}
            </Link>

            {/* Owner */}
            <OwnerAvatar who={owner} />

            {/* Revenue */}
            <span className="text-[13px] font-bold tabular-nums" style={{ color: rev > 0 ? '#1E6B5E' : '#9AA5AC' }}>
              {rev > 0 ? fmt(rev) : '—'}
            </span>

            {/* Touched */}
            <span className="text-[12px]" style={{ color: '#6B7A82' }}>{touched}</span>
          </div>
        )
      })}

      {projects.length === 0 && (
        <div className="py-12 text-center text-[13px]" style={{ color: '#9AA5AC' }}>No projects in this stage.</div>
      )}
    </div>
  )
}
