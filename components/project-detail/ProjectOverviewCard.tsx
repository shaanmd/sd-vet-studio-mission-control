'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project, RevenueStream, ProjectDomain, ProjectType } from '@/lib/types/database'

interface Props {
  project: Project
  bare?: boolean  // when true, renders without outer card wrapper (used inside accordions)
}

// ─── Project Type ──────────────────────────────────────────────────────────────

const PROJECT_TYPES: Array<{ value: ProjectType; label: string; color: string; bg: string }> = [
  { value: 'website_build', label: '🌐 Website',    color: '#1E6B5E', bg: '#E8F1EE' },
  { value: 'saas',          label: '💻 SaaS / App', color: '#7B5EA8', bg: '#EEE8F6' },
  { value: 'course',        label: '🎓 Course',     color: '#D4A853', bg: '#FBF3DE' },
  { value: 'consulting',    label: '💼 Consulting',  color: '#3A6C98', bg: '#E8F0F8' },
  { value: 'other',         label: '📦 Other',       color: '#6B7A82', bg: '#F5F0E8' },
]

// ─── Overview fields ───────────────────────────────────────────────────────────

const FIELDS = [
  { key: 'goals',           label: '🎯 Goals',           placeholder: 'What are we trying to achieve?' },
  { key: 'tech_stack',      label: '🔧 Tech Stack',      placeholder: 'e.g. Next.js, Supabase, Tailwind, Vercel' },
  { key: 'target_audience', label: '👥 Target Audience', placeholder: 'Who is this for?' },
] as const

const REVENUE_STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course',         label: '🎓 Course' },
  { value: 'subscription',   label: '🔄 Subscription' },
  { value: 'inapp',          label: '📱 In-app' },
  { value: 'consulting',     label: '💼 Consulting' },
  { value: 'website_builds', label: '🌐 Website builds' },
  { value: 'sponsorship',    label: '🤝 Sponsorship' },
  { value: 'affiliate',      label: '🔗 Affiliate' },
  { value: 'other',          label: '📦 Other' },
]

// ─── Domain helpers ────────────────────────────────────────────────────────────

const BLANK_DOMAIN: ProjectDomain = { name: '', registrar: '', expiry: '' }

function expiryStatus(expiry: string): { label: string; color: string; bg: string } {
  if (!expiry) return { label: '', color: '', bg: '' }
  const days = Math.round((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0)   return { label: 'Expired',       color: '#C0392B', bg: '#FDECEA' }
  if (days <= 30) return { label: `${days}d left`, color: '#C0392B', bg: '#FDECEA' }
  if (days <= 90) return { label: `${days}d left`, color: '#B7791F', bg: '#FEF3C7' }
  return {
    label: new Date(expiry).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
    color: '#6B7A82', bg: '#F5F0E8',
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionDivider() {
  return <div style={{ borderTop: '1px solid #F5F0E8' }} />
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold mb-1.5" style={{ color: '#9AA5AC' }}>{children}</div>
}

function InlineInput({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-1.5 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
        style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
      />
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
        className="w-full rounded px-2 py-1 text-[12px] border focus:outline-none"
        style={{ borderColor: '#E8E2D6' }}
      />
      <div className="flex gap-2">
        <input
          value={value.registrar}
          onChange={e => onChange({ ...value, registrar: e.target.value })}
          placeholder="Registrar (e.g. Cloudflare)"
          className="flex-1 rounded px-2 py-1 text-[12px] border focus:outline-none"
          style={{ borderColor: '#E8E2D6' }}
        />
        <input
          type="date"
          value={value.expiry}
          onChange={e => onChange({ ...value, expiry: e.target.value })}
          className="w-36 rounded px-2 py-1 text-[12px] border focus:outline-none"
          style={{ borderColor: '#E8E2D6' }}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!value.name.trim()}
          className="px-3 py-1 rounded text-[12px] font-semibold text-white disabled:opacity-40"
          style={{ background: '#1E6B5E' }}
        >Save</button>
        <button onClick={onCancel} className="text-[12px] px-2" style={{ color: '#9AA5AC' }}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Website Build Panel ───────────────────────────────────────────────────────

function WebsiteBuildPanel({ project, onPatch }: { project: Project; onPatch: (p: Record<string, unknown>) => void }) {
  const [clientName, setClientName]     = useState(project.client_name ?? '')
  const [clientEmail, setClientEmail]   = useState(project.client_email ?? '')
  const [deliveryDate, setDeliveryDate] = useState(project.delivery_date ?? '')
  const [ga4Id, setGa4Id]               = useState(project.ga4_property_id ?? '')
  const [visitors, setVisitors]         = useState(project.monthly_visitors?.toString() ?? '')
  const [dirty, setDirty]               = useState(false)
  const [saving, setSaving]             = useState(false)

  function mark(setter: (v: string) => void) {
    return (v: string) => { setter(v); setDirty(true) }
  }

  async function save() {
    setSaving(true)
    await onPatch({
      client_name: clientName || null,
      client_email: clientEmail || null,
      delivery_date: deliveryDate || null,
      ga4_property_id: ga4Id || null,
      monthly_visitors: visitors ? parseInt(visitors) : null,
    })
    setSaving(false)
    setDirty(false)
  }

  const deliveryStatus = (() => {
    if (!deliveryDate) return null
    const days = Math.round((new Date(deliveryDate).getTime() - Date.now()) / 86400000)
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: '#C0392B', bg: '#FDECEA' }
    if (days === 0) return { label: 'Due today!', color: '#C0392B', bg: '#FDECEA' }
    if (days <= 7) return { label: `${days}d to go`, color: '#B7791F', bg: '#FEF3C7' }
    return { label: new Date(deliveryDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }), color: '#1E6B5E', bg: '#E8F4F0' }
  })()

  const ga4Url = ga4Id
    ? `https://analytics.google.com/analytics/web/#/p${ga4Id.replace('G-', '')}/reports/intelligenthome`
    : 'https://analytics.google.com'

  const vercelUrl = project.vercel_project_id
    ? `https://vercel.com/dashboard`
    : null

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <FieldLabel>🏢 Client</FieldLabel>
      <div className="flex gap-2">
        <input
          value={clientName}
          onChange={e => mark(setClientName)(e.target.value)}
          placeholder="Client name"
          className="flex-1 rounded-lg px-3 py-1.5 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
        />
        <input
          value={clientEmail}
          onChange={e => mark(setClientEmail)(e.target.value)}
          placeholder="client@email.com"
          type="email"
          className="flex-1 rounded-lg px-3 py-1.5 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
        />
      </div>

      <div>
        <FieldLabel>📅 Delivery Date</FieldLabel>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={deliveryDate}
            onChange={e => mark(setDeliveryDate)(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
          />
          {deliveryStatus && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: deliveryStatus.bg, color: deliveryStatus.color }}>
              {deliveryStatus.label}
            </span>
          )}
        </div>
      </div>

      <SectionDivider />

      <FieldLabel>📊 Analytics</FieldLabel>

      <div>
        <div className="text-[11px] mb-1" style={{ color: '#9AA5AC' }}>Google Analytics 4 — Property ID</div>
        <div className="flex items-center gap-2">
          <input
            value={ga4Id}
            onChange={e => mark(setGa4Id)(e.target.value)}
            placeholder="G-XXXXXXXXXX"
            className="flex-1 rounded-lg px-3 py-1.5 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30 font-mono"
            style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
          />
          <a
            href={ga4Url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: '#E8F0FE', color: '#1D4ED8' }}
          >
            Open GA4 ↗
          </a>
        </div>
      </div>

      <div>
        <div className="text-[11px] mb-1" style={{ color: '#9AA5AC' }}>Monthly Visitors</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={visitors}
            onChange={e => mark(setVisitors)(e.target.value)}
            placeholder="e.g. 1200"
            className="w-36 rounded-lg px-3 py-1.5 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
          />
          <span className="text-[12px]" style={{ color: '#9AA5AC' }}>visitors / month</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {vercelUrl && (
          <a
            href={vercelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: '#000', color: '#fff' }}
          >
            ▲ Vercel Dashboard ↗
          </a>
        )}
        {project.live_url && (
          <a
            href={project.live_url.startsWith('http') ? project.live_url : `https://${project.live_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
            style={{ background: '#F5F0E8', color: '#1E2A35', border: '1px solid #E8E2D6' }}
          >
            🌐 Live Site ↗
          </a>
        )}
      </div>

      {dirty && (
        <button
          onClick={save}
          disabled={saving}
          className="self-start px-4 py-1.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ProjectOverviewCard({ project, bare = false }: Props) {
  const router = useRouter()
  const [projectType, setProjectType] = useState<ProjectType | null>(project.project_type ?? null)
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
    await saveDomains([...domains, { ...newDomain, name: newDomain.name.trim() }])
    setNewDomain(BLANK_DOMAIN)
    setAddingDomain(false)
  }

  async function handleSaveDomainEdit(idx: number) {
    if (!editDomain.name.trim()) return
    await saveDomains(domains.map((d, i) => i === idx ? { ...editDomain, name: editDomain.name.trim() } : d))
    setEditingDomainIdx(null)
  }

  async function handleRemoveDomain(idx: number) {
    await saveDomains(domains.filter((_, i) => i !== idx))
  }

  async function handleTypeChange(t: ProjectType) {
    const next = projectType === t ? null : t
    setProjectType(next)
    await patchProject({ project_type: next })
  }

  const typeInfo = PROJECT_TYPES.find(t => t.value === projectType)

  const inner = (
    <div>
      {!bare && (
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
          <span className="font-semibold text-[13px]" style={{ color: '#1E2A35' }}>Overview</span>
        </div>
      )}

      {/* Project Type */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <FieldLabel>Project Type</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {PROJECT_TYPES.map(t => {
            const active = projectType === t.value
            return (
              <button
                key={t.value}
                onClick={() => handleTypeChange(t.value)}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors border"
                style={active
                  ? { background: t.bg, color: t.color, borderColor: t.color + '50' }
                  : { background: '#F5F0E8', color: '#9AA5AC', borderColor: '#E8E2D6' }}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Website Build specific panel */}
      {projectType === 'website_build' && (
        <>
          <WebsiteBuildPanel project={project} onPatch={patchProject} />
          <SectionDivider />
        </>
      )}

      {/* Revenue streams */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <FieldLabel>💰 Revenue Stream</FieldLabel>
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
            <FieldLabel>{f.label}</FieldLabel>
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
            <FieldLabel>🌐 Domains</FieldLabel>
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
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingDomainIdx(i); setEditDomain(d) }}
                      className="text-[11px] px-1.5 rounded"
                      style={{ color: '#6B7A82' }}
                    >Edit</button>
                    <button
                      onClick={() => handleRemoveDomain(i)}
                      className="text-[11px] px-1.5 rounded"
                      style={{ color: '#C0392B' }}
                    >✕</button>
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

  if (bare) return inner

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      {inner}
    </div>
  )
}
