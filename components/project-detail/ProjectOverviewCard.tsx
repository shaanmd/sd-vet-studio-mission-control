'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, RevenueStream } from '@/lib/types/database'

interface Props {
  project: Project
}

const FIELDS = [
  { key: 'goals', label: '🎯 Goals', placeholder: 'What are we trying to achieve with this project?' },
  { key: 'tech_stack', label: '🔧 Tech Stack', placeholder: 'e.g. Next.js, Supabase, Tailwind, Vercel' },
  { key: 'target_audience', label: '👥 Target Audience', placeholder: 'Who is this for?' },
] as const

const REVENUE_STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course', label: '🎓 Course' },
  { value: 'subscription', label: '🔄 Subscription' },
  { value: 'inapp', label: '📱 In-app' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'website_builds', label: '🌐 Website builds' },
  { value: 'sponsorship', label: '🤝 Sponsorship' },
  { value: 'affiliate', label: '🔗 Affiliate' },
  { value: 'other', label: '📦 Other' },
]

export default function ProjectOverviewCard({ project }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState({
    goals: project.goals ?? '',
    tech_stack: project.tech_stack ?? '',
    target_audience: project.target_audience ?? '',
  })
  const [streams, setStreams] = useState<RevenueStream[]>(project.revenue_stream ?? [])
  const [saving, setSaving] = useState(false)

  function toggleStream(s: RevenueStream) {
    const next = streams.includes(s) ? streams.filter(x => x !== s) : [...streams, s]
    setStreams(next)
    fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revenue_stream: next }),
    }).then(() => router.refresh())
  }

  async function handleSave(key: string) {
    setSaving(true)
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: values[key as keyof typeof values] || null }),
    })
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  const hasAny = FIELDS.some(f => values[f.key])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <span className="font-semibold text-[13px]" style={{ color: '#1E2A35' }}>Overview</span>
      </div>

      {!hasAny && editing === null && (
        <button
          onClick={() => setEditing('goals')}
          className="w-full px-4 py-4 text-left text-[13px] italic"
          style={{ color: '#9AA5AC' }}
        >
          Click any field to add goals, tech stack, audience…
        </button>
      )}

      {/* Revenue streams */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <div className="text-[11px] font-semibold mb-2" style={{ color: '#9AA5AC' }}>💰 Revenue Stream</div>
        <div className="flex flex-wrap gap-1.5">
          {REVENUE_STREAMS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleStream(s.value)}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors"
              style={streams.includes(s.value)
                ? { background: '#1E6B5E', color: '#fff' }
                : { background: '#F5F0E8', color: '#9AA5AC', border: '1px solid #E8E2D6' }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: '#F5F0E8' }}>
        {FIELDS.map(f => (
          <div key={f.key} className="px-4 py-3 group">
            <div className="text-[11px] font-semibold mb-1" style={{ color: '#9AA5AC' }}>{f.label}</div>
            {editing === f.key ? (
              <div className="flex flex-col gap-2">
                <textarea
                  autoFocus
                  value={values[f.key]}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Escape') setEditing(null) }}
                  placeholder={f.placeholder}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(f.key)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                    style={{ background: '#1E6B5E' }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(null)} className="text-[12px] text-gray-400 px-2">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditing(f.key)}
                className="w-full text-left"
              >
                {values[f.key] ? (
                  <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#2A3A48' }}>{values[f.key]}</p>
                ) : (
                  <p className="text-[13px] italic opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#9AA5AC' }}>
                    {f.placeholder}
                  </p>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
