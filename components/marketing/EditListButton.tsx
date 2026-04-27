'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { NewsletterList } from '@/lib/types/database'

interface ProjectOption { id: string; name: string; emoji: string | null }

interface Props {
  mode: 'create' | 'edit'
  list?: NewsletterList & { project?: { id: string; name: string; emoji: string | null } | null }
  projects: ProjectOption[]
  label?: string
}

const PRESET_PALETTES: { name: string; primary: string; accent: string }[] = [
  { name: 'SD VetStudio', primary: '#1E6B5E', accent: '#D4A853' },
  { name: 'SynAlpseVet',  primary: '#7B5EA8', accent: '#F2B843' },
  { name: 'Behind the Bit', primary: '#8B5A3C', accent: '#D4A853' },
  { name: 'VetRehab',     primary: '#2C7CB0', accent: '#5BAA8A' },
]

export default function EditListButton({ mode, list, projects, label }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [name, setName] = useState(list?.name ?? '')
  const [description, setDescription] = useState(list?.description ?? '')
  const [projectId, setProjectId] = useState(list?.project_id ?? '')
  const [fromEmail, setFromEmail] = useState(list?.from_email ?? 'noreply@sdvetstudio.com')
  const [fromName, setFromName] = useState(list?.from_name ?? 'Mission Control')
  const [brandPrimary, setBrandPrimary] = useState(list?.brand_primary ?? '#1E6B5E')
  const [brandAccent, setBrandAccent] = useState(list?.brand_accent ?? '#D4A853')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(list?.name ?? '')
    setDescription(list?.description ?? '')
    setProjectId(list?.project_id ?? '')
    setFromEmail(list?.from_email ?? 'noreply@sdvetstudio.com')
    setFromName(list?.from_name ?? 'Mission Control')
    setBrandPrimary(list?.brand_primary ?? '#1E6B5E')
    setBrandAccent(list?.brand_accent ?? '#D4A853')
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      project_id: projectId || null,
      from_email: fromEmail.trim(),
      from_name: fromName.trim(),
      brand_primary: brandPrimary,
      brand_accent: brandAccent,
    }

    const url = mode === 'create' ? '/api/newsletter-lists' : `/api/newsletter-lists/${list!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Save failed')
      setSaving(false)
      return
    }

    setOpen(false)
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!list) return
    if (!confirm(`Delete list "${list.name}"? This can't be undone.`)) return
    setSaving(true)
    const res = await fetch(`/api/newsletter-lists/${list.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Delete failed')
      setSaving(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: '#2A3A48' }
  const inputStyle = { border: '1px solid #E8E2D6', background: '#fff', color: '#0D2035' }

  const triggerStyle = mode === 'create'
    ? { background: '#1E6B5E', color: '#fff', border: 'none' as const, padding: '6px 12px' }
    : { background: '#fff', color: '#6B7A82', border: '1px solid #E8E2D6', padding: '4px 10px' }

  const modal = open && mounted ? createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'rgba(13,32,53,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) { reset(); setOpen(false) } }}
    >
      <div className="flex min-h-full items-start justify-center p-4">
        <div
          className="rounded-2xl w-full"
          style={{
            maxWidth: 540, background: '#FBF7EF', border: '1px solid #E8E2D6',
            padding: '24px 28px', margin: '32px 0',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold" style={{ fontSize: 18, color: '#0D2035' }}>
              {mode === 'create' ? 'New newsletter list' : `Edit "${list?.name}"`}
            </h2>
            <button onClick={() => { reset(); setOpen(false) }} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9AA5AC', cursor: 'pointer' }}>×</button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="block mb-1.5" style={labelStyle}>List name <span style={{ color: '#C0392B' }}>*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. SynAlpseVet"
                required
                autoFocus
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block mb-1.5" style={labelStyle}>Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What this list is for"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block mb-1.5" style={labelStyle}>Linked project</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={inputStyle}
              >
                <option value="">— None —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji ?? '📁'} {p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block mb-1.5" style={labelStyle}>From name</label>
                <input
                  value={fromName}
                  onChange={e => setFromName(e.target.value)}
                  placeholder="SynAlpseVet"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block mb-1.5" style={labelStyle}>From email</label>
                <input
                  value={fromEmail}
                  onChange={e => setFromEmail(e.target.value)}
                  type="email"
                  placeholder="hello@synaipse.vet"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#B7791F', background: '#FDF3E0', padding: '8px 12px', borderRadius: 8 }}>
              ⚠️ Each domain (e.g. <code>synaipse.vet</code>) must be verified in Resend → Domains before sending. Otherwise the send will silently fail.
            </p>

            <div>
              <label className="block mb-1.5" style={labelStyle}>Brand colours</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_PALETTES.map(p => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => { setBrandPrimary(p.primary); setBrandAccent(p.accent) }}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
                    style={{
                      border: brandPrimary === p.primary && brandAccent === p.accent ? '1px solid #1E6B5E' : '1px solid #E8E2D6',
                      background: '#fff',
                      fontSize: 11, fontWeight: 600, color: '#6B7A82',
                      cursor: 'pointer',
                    }}
                    title={p.name}
                  >
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: p.primary }} />
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: p.accent }} />
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: '#6B7A82' }}>
                  Primary
                  <input
                    type="color"
                    value={brandPrimary}
                    onChange={e => setBrandPrimary(e.target.value)}
                    style={{ width: 36, height: 28, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                  />
                  <code style={{ fontSize: 11, background: '#F5F0E8', padding: '2px 6px', borderRadius: 4 }}>{brandPrimary}</code>
                </label>
                <label className="flex items-center gap-2" style={{ fontSize: 12, color: '#6B7A82' }}>
                  Accent
                  <input
                    type="color"
                    value={brandAccent}
                    onChange={e => setBrandAccent(e.target.value)}
                    style={{ width: 36, height: 28, border: 'none', padding: 0, background: 'none', cursor: 'pointer' }}
                  />
                  <code style={{ fontSize: 11, background: '#F5F0E8', padding: '2px 6px', borderRadius: 4 }}>{brandAccent}</code>
                </label>
              </div>
            </div>

            {/* Mini preview */}
            <div
              className="rounded-xl mt-1"
              style={{
                background: '#fff',
                border: '1px solid #E8E2D6',
                borderTop: `4px solid ${brandPrimary}`,
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 11, color: '#9AA5AC', marginBottom: 4 }}>Email shell preview</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0D2035' }}>{fromName || 'List name'}</div>
              <div style={{ fontSize: 11, color: '#6B7A82' }}>{fromEmail || 'noreply@sdvetstudio.com'}</div>
              <div style={{
                fontSize: 11, color: '#fff', display: 'inline-block',
                background: brandAccent, padding: '3px 8px', borderRadius: 4, marginTop: 8,
              }}>
                Accent button
              </div>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#C0392B', background: '#FDECEA', borderRadius: 8, padding: '8px 12px' }}>
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-2 mt-2">
              {mode === 'edit' ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  style={{
                    fontSize: 12, color: '#C0392B', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '4px 8px',
                  }}
                >
                  Delete list…
                </button>
              ) : <span />}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { reset(); setOpen(false) }}
                  className="rounded-xl px-4 py-2 text-sm font-medium"
                  style={{ color: '#6B7A82', background: '#fff', border: '1px solid #E8E2D6' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: saving ? '#9AA5AC' : '#1E6B5E' }}
                >
                  {saving ? 'Saving…' : (mode === 'create' ? 'Create list' : 'Save changes')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg text-[12px] font-semibold whitespace-nowrap"
        style={{ ...triggerStyle, cursor: 'pointer' }}
      >
        {label ?? (mode === 'create' ? '+ New list' : 'Edit')}
      </button>
      {modal}
    </>
  )
}
