'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InterestLevel, SourceChannel, BroughtInBy } from '@/lib/types/database'
import { SOURCE_CHANNELS, BROUGHT_IN_BY } from './sourceConstants'

interface Lead {
  id: string
  name: string
  role_clinic?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  source?: string | null
  source_channel?: SourceChannel | null
  brought_in_by?: BroughtInBy | null
  interest_level: string
  project_id: string
  is_beta_tester?: boolean
  status?: string | null
  converted_contact_id?: string | null
}

interface Props {
  lead: Lead
  projects: Array<{ id: string; name: string; emoji: string }>
  onClose: () => void
}

const STATUSES = [
  { value: 'active',    label: '🟢 Active',        bg: '#E8F4F0', color: '#1E6B5E' },
  { value: 'contacted', label: '📨 Contacted',     bg: '#EDE9FE', color: '#5B21B6' },
  { value: 'trialing',  label: '🔬 Trialing',      bg: '#FDF3E0', color: '#B7791F' },
  { value: 'converted', label: '🏆 Converted',     bg: '#D1FAE5', color: '#065F46' },
  { value: 'archived',  label: '📦 Archived',      bg: '#F3F4F6', color: '#6B7280' },
]

export default function EditLeadModal({ lead, projects, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(lead.name)
  const [roleClinic, setRoleClinic] = useState(lead.role_clinic ?? '')
  const [email, setEmail] = useState(lead.contact_email ?? '')
  const [phone, setPhone] = useState(lead.contact_phone ?? '')
  const [source, setSource] = useState(lead.source ?? '')
  const [sourceChannel, setSourceChannel] = useState<SourceChannel | null>(lead.source_channel ?? null)
  const [broughtInBy, setBroughtInBy] = useState<BroughtInBy | null>(lead.brought_in_by ?? null)
  const [interestLevel, setInterestLevel] = useState<InterestLevel>(lead.interest_level as InterestLevel)
  const [projectId, setProjectId] = useState(lead.project_id)
  const [isBetaTester, setIsBetaTester] = useState(lead.is_beta_tester ?? false)
  const [status, setStatus] = useState(lead.status ?? 'active')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertedContactId, setConvertedContactId] = useState<string | null>(lead.converted_contact_id ?? null)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        role_clinic: roleClinic || null,
        contact_email: email || null,
        contact_phone: phone || null,
        source: source || null,
        source_channel: sourceChannel,
        brought_in_by: broughtInBy,
        interest_level: interestLevel,
        project_id: projectId,
        is_beta_tester: isBetaTester,
        status,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    router.refresh()
    onClose()
  }

  async function handleConvert() {
    if (!confirm(`Convert "${lead.name}" to a Contact?\n\nThis creates a contact in the CRM and links it to the lead's project. The lead itself stays put.`)) return
    setConverting(true)
    setError('')
    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: 'POST' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to convert')
      setConverting(false)
      return
    }
    const { contact } = await res.json()
    setConvertedContactId(contact.id)
    setConverting(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    setDeleting(true)
    await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
    router.refresh()
    onClose()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Edit Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name *" className={inputCls} autoFocus />
          <input value={roleClinic} onChange={e => setRoleClinic(e.target.value)} placeholder="Role / clinic" className={inputCls} />
          <div className="flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
          {/* Source channel */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Came in via</label>
            <div className="flex gap-1.5 flex-wrap">
              {SOURCE_CHANNELS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSourceChannel(prev => prev === c.value ? null : c.value)}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors"
                  style={sourceChannel === c.value
                    ? { background: '#E8F4F0', color: '#1E6B5E', borderColor: '#1E6B5E' }
                    : { borderColor: '#E8E2D6', color: '#6B7280' }}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brought in by */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Brought in by</label>
            <div className="flex gap-1.5">
              {BROUGHT_IN_BY.map(b => (
                <button
                  key={b.value}
                  type="button"
                  onClick={() => setBroughtInBy(prev => prev === b.value ? null : b.value)}
                  className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors"
                  style={broughtInBy === b.value
                    ? { background: '#E8F4F0', color: '#1E6B5E', borderColor: '#1E6B5E' }
                    : { borderColor: '#E8E2D6', color: '#6B7280' }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source specifics (e.g. AVA conference)" className={inputCls} />

          {/* Interest level */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Interest</label>
            <div className="flex gap-2">
              {(['hot', 'warm', 'curious'] as InterestLevel[]).map(level => (
                <button key={level} type="button" onClick={() => setInterestLevel(level)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                    interestLevel === level ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {{ hot: '🔥', warm: '👍', curious: '🤷' }[level]} {level}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Status</label>
            <div className="flex gap-1.5 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors"
                  style={status === s.value ? { background: s.bg, color: s.color, borderColor: s.color } : { borderColor: '#E8E2D6', color: '#6B7280' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project */}
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>

          {/* Beta tester */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isBetaTester} onChange={e => setIsBetaTester(e.target.checked)} className="rounded text-teal-600" />
            <span className="text-sm text-gray-700">Beta tester</span>
          </label>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {/* Convert to Contact */}
          {convertedContactId ? (
            <a
              href={`/crm/${convertedContactId}`}
              className="block w-full text-center text-sm font-semibold py-2 rounded-lg no-underline"
              style={{ background: '#E8F4F0', color: '#1E6B5E' }}
            >
              ✓ Converted — view contact →
            </a>
          ) : (
            <button
              type="button"
              onClick={handleConvert}
              disabled={converting}
              className="block w-full text-center text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
              style={{ background: '#F5F0E8', color: '#1E6B5E', border: '1px solid #1E6B5E' }}
            >
              {converting ? 'Converting…' : '👥 Convert to Contact'}
            </button>
          )}

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="w-full text-center text-sm text-red-500 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete lead…'}
          </button>
        </form>
      </div>
      </div>
    </div>
  )
}
