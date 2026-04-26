'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, RevenueStream, ProjectDomain } from '@/lib/types/database'

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

const BLANK_DOMAIN: ProjectDomain = { name: '', registrar: '', expiry: '' }

function expiryStatus(expiry: string): { label: string; color: string; bg: string } {
  if (!expiry) return { label: '', color: '', bg: '' }
  const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0)   return { label: 'Expired',          color: '#C0392B', bg: '#FDECEA' }
  if (days <= 30) return { label: `${days}d left`,    color: '#C0392B', bg: '#FDECEA' }
  if (days <= 90) return { label: `${days}d left`,    color: '#B7791F', bg: '#FEF3C7' }
  return { label: new Date(expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }), color: '#6B7A82', bg: '#F5F0E8' }
}

export default function ProjectOverviewCard({ project }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState({
    goals: project.goals ?? '',
    tech_stack: project.tech_stack ?? '',
    target_audience: project.target_audience ?? '',
  })
  const [streams, setStreams] = useState<RevenueStream[]>(project.revenue_stream ?? [])
  const [domains, setDomains] = useState<ProjectDomain[]>(project.domains ?? [])
  const [addingDomain, setAddingDomain] = useState(false)
  const [newDomain, setNewDomain] = useState<ProjectDomain>(BLANK_DOMAIN)
  const [editingDomainIdx, setEditingDomainIdx] = useState<number | null>(null)
  const [editDomain, setEditDomain] = useState<ProjectDomain>(BLANK_DOMAIN)
  const [saving, setSaving] = useState(false)

  async function patchProject(patch: Record<string, unknown>) {
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    router.refresh()
  }

  function toggleStream(s: RevenueStream) {
    const next = streams.includes(s) ? streams.filter(x => x !== s) : [...streams, s]
    setStreams(next)
    patchProject({ revenue_stream: next })
  }

  async function handleSave(key: string) {
    setSaving(true)
    await patchProject({ [key]: values[key as keyof typeof values] || null })
    setSaving(false)
    setEditing(null)
  }

  async function saveDomains(next: ProjectDomain[]) {
    setDomains(next)
    await patchProject({ domains: next })
  }

  async function handleAddDomain() {
    if (!newDomain.name.trim()) return
    const next = [...domains, { ...newDomain, name: newDomain.name.trim() }]
    await saveDomains(next)
    setNewDomain(BLANK_DOMAIN)
    setAddingDomain(false)
  }

  async function handleSaveDomainEdit(idx: number) {
    if (!editDomain.name.trim()) return
    const next = domains.map((d, i) => i === idx ? { ...editDomain, name: editDomain.name.trim() } : d)
    await saveDomains(next)
    setEditingDomainIdx(null)
  }

  async function handleRemoveDomain(idx: number) {
    await saveDomains(domains.filter((_, i) => i !== idx))
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

      {/* Goals / Tech Stack / Audience */}
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
              <button onClick={() => setEditing(f.key)} className="w-full text-left">
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

        {/* Domains */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold" style={{ color: '#9AA5AC' }}>🌐 Domains</div>
            {!addingDomain && (
              <button
                onClick={() => setAddingDomain(true)}
                className="text-[11px] font-semibold px-2 py-0.5 rounded"
                style={{ color: '#1E6B5E' }}
              >
                + Add
              </button>
            )}
          </div>

          {/* Domain list */}
          {domains.length === 0 && !addingDomain && (
            <p className="text-[12px] italic" style={{ color: '#CDC3AE' }}>No domains yet — click + Add</p>
          )}

          <div className="flex flex-col gap-1.5">
            {domains.map((d, i) => {
              const status = expiryStatus(d.expiry)
              if (editingDomainIdx === i) {
                return (
                  <DomainForm
                    key={i}
                    value={editDomain}
                    onChange={setEditDomain}
                    onSave={() => handleSaveDomainEdit(i)}
                    onCancel={() => setEditingDomainIdx(null)}
                  />
                )
              }
              return (
                <div
                  key={i}
                  className="group flex items-center gap-2 rounded-lg px-3 py-2 text-[12px]"
                  style={{ background: '#F5F0E8' }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold" style={{ color: '#1E2A35' }}>{d.name}</span>
                    {d.registrar && <span className="ml-2" style={{ color: '#9AA5AC' }}>{d.registrar}</span>}
                  </div>
                  {d.expiry && status.label && (
                    <span
                      className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingDomainIdx(i); setEditDomain(d) }}
                      className="text-[11px] px-1.5 rounded"
                      style={{ color: '#6B7A82' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveDomain(i)}
                      className="text-[11px] px-1.5 rounded"
                      style={{ color: '#C0392B' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )
            })}

            {addingDomain && (
              <DomainForm
                value={newDomain}
                onChange={setNewDomain}
                onSave={handleAddDomain}
                onCancel={() => { setAddingDomain(false); setNewDomain(BLANK_DOMAIN) }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DomainForm({ value, onChange, onSave, onCancel }: {
  value: ProjectDomain
  onChange: (d: ProjectDomain) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="rounded-lg p-2.5 flex flex-col gap-2" style={{ background: '#F5F0E8', border: '1px solid #E8E2D6' }}>
      <input
        autoFocus
        value={value.name}
        onChange={e => onChange({ ...value, name: e.target.value })}
        placeholder="domain.com.au"
        className="w-full rounded px-2 py-1 text-[12px] border focus:outline-none focus:ring-1 focus:ring-teal-500/40"
        style={{ borderColor: '#E8E2D6' }}
      />
      <div className="flex gap-2">
        <input
          value={value.registrar}
          onChange={e => onChange({ ...value, registrar: e.target.value })}
          placeholder="Registrar (e.g. Cloudflare)"
          className="flex-1 rounded px-2 py-1 text-[12px] border focus:outline-none focus:ring-1 focus:ring-teal-500/40"
          style={{ borderColor: '#E8E2D6' }}
        />
        <input
          type="date"
          value={value.expiry}
          onChange={e => onChange({ ...value, expiry: e.target.value })}
          className="w-36 rounded px-2 py-1 text-[12px] border focus:outline-none focus:ring-1 focus:ring-teal-500/40"
          style={{ borderColor: '#E8E2D6' }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!value.name.trim()}
          className="px-3 py-1 rounded text-[12px] font-semibold text-white disabled:opacity-40"
          style={{ background: '#1E6B5E' }}
        >
          Save
        </button>
        <button onClick={onCancel} className="text-[12px] px-2" style={{ color: '#9AA5AC' }}>Cancel</button>
      </div>
    </div>
  )
}
