'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type {
  LifecycleStage, InterestLevel, SourceChannel, BroughtInBy,
} from '@/lib/types/database'
import { SOURCE_CHANNELS, BROUGHT_IN_BY } from '@/components/leads/sourceConstants'

interface NewContactButtonProps {
  label?: string
  defaultStage?: LifecycleStage
}

const STAGES: { value: LifecycleStage; label: string; emoji: string }[] = [
  { value: 'lead',      label: 'Lead',      emoji: '🎯' },
  { value: 'qualified', label: 'Qualified', emoji: '🔬' },
  { value: 'customer',  label: 'Customer',  emoji: '🏆' },
  { value: 'past',      label: 'Past',      emoji: '📦' },
]

const INTEREST_OPTIONS: { value: InterestLevel; label: string; emoji: string }[] = [
  { value: 'hot',     label: 'Hot',     emoji: '🔥' },
  { value: 'warm',    label: 'Warm',    emoji: '👍' },
  { value: 'curious', label: 'Curious', emoji: '🤷' },
]

interface ProjectOption { id: string; name: string; emoji: string | null }

export default function NewContactButton({ label = '+ New contact', defaultStage = 'customer' }: NewContactButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [stage, setStage] = useState<LifecycleStage>(defaultStage)
  const [interest, setInterest] = useState<InterestLevel | null>(null)
  const [channel, setChannel] = useState<SourceChannel | null>(null)
  const [broughtBy, setBroughtBy] = useState<BroughtInBy | null>(null)
  const [sourceNotes, setSourceNotes] = useState('')
  const [isBetaTester, setIsBetaTester] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [projectRole, setProjectRole] = useState('')

  // Projects for the optional link dropdown
  const [projects, setProjects] = useState<ProjectOption[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]))
  }, [open])

  function reset() {
    setName(''); setCompany(''); setRole(''); setEmail(''); setPhone('')
    setStage(defaultStage); setInterest(null); setChannel(null); setBroughtBy(null)
    setSourceNotes(''); setIsBetaTester(false); setProjectId(''); setProjectRole('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    try {
      // 1. Create the contact
      const createRes = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim() || null,
          role: role.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          lifecycle_stage: stage,
          interest_level: interest,
          source_channel: channel,
          brought_in_by: broughtBy,
          source: sourceNotes.trim() || null,
          is_beta_tester: isBetaTester,
        }),
      })
      if (!createRes.ok) {
        const j = await createRes.json().catch(() => ({}))
        throw new Error(j.error ?? 'Failed to save contact')
      }
      const contact = await createRes.json()

      // 2. Optionally link to a project
      if (projectId && contact?.id) {
        await fetch(`/api/projects/${projectId}/contacts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contact_id: contact.id,
            role_label: projectRole.trim() || null,
          }),
        })
      }

      reset()
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const showInterest = stage === 'lead' || stage === 'qualified'
  const labelCls = 'block mb-1'
  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: '#2A3A48' }
  const inputCls = 'w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2'
  const inputStyle = { border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }

  function pillButton<T extends string>(active: boolean, onClick: () => void, content: React.ReactNode) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          fontSize: 12, fontWeight: 600,
          padding: '5px 12px', borderRadius: 999,
          border: `1px solid ${active ? '#1E6B5E' : '#E8E2D6'}`,
          background: active ? '#E8F4F0' : '#FFFFFF',
          color: active ? '#1E6B5E' : '#6B7A82',
          cursor: 'pointer',
        }}
      >
        {content}
      </button>
    )
  }

  const modal = open && mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(13,32,53,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="flex min-h-full items-start justify-center p-4">
            <div
              className="rounded-2xl w-full"
              style={{
                maxWidth: 520, background: '#FBF7EF', border: '1px solid #E8E2D6',
                padding: '24px 28px', margin: '32px 0',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold" style={{ fontSize: 18, color: '#0D2035' }}>New contact</h2>
                <button type="button" onClick={() => setOpen(false)} style={{ fontSize: 20, color: '#9AA5AC', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">

                {/* Lifecycle stage */}
                <div>
                  <label className={labelCls} style={labelStyle}>Lifecycle stage</label>
                  <div className="flex flex-wrap gap-1.5">
                    {STAGES.map(s => pillButton(stage === s.value, () => setStage(s.value), `${s.emoji} ${s.label}`))}
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className={labelCls} style={labelStyle}>Name <span style={{ color: '#C0392B' }}>*</span></label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required className={inputCls} style={inputStyle} autoFocus />
                </div>

                {/* Company + Role row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls} style={labelStyle}>Company</label>
                    <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Vet Clinic" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Role</label>
                    <input value={role} onChange={e => setRole(e.target.value)} placeholder="Practice manager" className={inputCls} style={inputStyle} />
                  </div>
                </div>

                {/* Email + Phone row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls} style={labelStyle}>Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="jane@acme.vet" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Phone</label>
                    <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+61 4xx xxx xxx" className={inputCls} style={inputStyle} />
                  </div>
                </div>

                {/* Interest (only for lead / qualified) */}
                {showInterest && (
                  <div>
                    <label className={labelCls} style={labelStyle}>Interest</label>
                    <div className="flex flex-wrap gap-1.5">
                      {INTEREST_OPTIONS.map(i => pillButton(
                        interest === i.value,
                        () => setInterest(interest === i.value ? null : i.value),
                        `${i.emoji} ${i.label}`,
                      ))}
                    </div>
                  </div>
                )}

                {/* Source channel */}
                <div>
                  <label className={labelCls} style={labelStyle}>Came in via</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SOURCE_CHANNELS.map(c => pillButton(
                      channel === c.value,
                      () => setChannel(channel === c.value ? null : c.value),
                      `${c.emoji} ${c.label}`,
                    ))}
                  </div>
                </div>

                {/* Brought in by */}
                <div>
                  <label className={labelCls} style={labelStyle}>Brought in by</label>
                  <div className="flex flex-wrap gap-1.5">
                    {BROUGHT_IN_BY.map(b => pillButton(
                      broughtBy === b.value,
                      () => setBroughtBy(broughtBy === b.value ? null : b.value),
                      b.label,
                    ))}
                  </div>
                </div>

                {/* Source notes */}
                <div>
                  <label className={labelCls} style={labelStyle}>Source specifics</label>
                  <input value={sourceNotes} onChange={e => setSourceNotes(e.target.value)} placeholder="e.g. AVA conference 2026, LinkedIn post" className={inputCls} style={inputStyle} />
                </div>

                {/* Beta tester */}
                <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: '#2A3A48' }}>
                  <input type="checkbox" checked={isBetaTester} onChange={e => setIsBetaTester(e.target.checked)} />
                  Beta tester
                </label>

                {/* Project link */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls} style={labelStyle}>Link to project</label>
                    <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">— None —</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.emoji ?? '📁'} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Project role</label>
                    <input value={projectRole} onChange={e => setProjectRole(e.target.value)} placeholder="e.g. Client" disabled={!projectId} className={inputCls} style={{ ...inputStyle, opacity: projectId ? 1 : 0.5 }} />
                  </div>
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: '#C0392B', background: '#FDECEA', borderRadius: 8, padding: '8px 12px' }}>
                    {error}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium" style={{ color: '#6B7A82', background: '#FFFFFF', border: '1px solid #E8E2D6' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: saving ? '#9AA5AC' : '#1E6B5E' }}>
                    {saving ? 'Saving…' : 'Save contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        type="button"
        data-new-contact
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
        style={{ background: '#1E6B5E' }}
      >
        {label}
      </button>
      {modal}
    </>
  )
}
