'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import type { CommsKind } from '@/lib/types/database'

interface ContactActionsProps {
  contactId: string
}

interface LogModalProps {
  contactId: string
  defaultKind: CommsKind
  onClose: () => void
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function LogModal({ contactId, defaultKind, onClose }: LogModalProps) {
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => setMounted(true), [])

  const kindLabel: Record<CommsKind, string> = {
    call:    '📞 Log call',
    email:   '✉ Log email',
    meeting: '🤝 Log meeting',
    note:    '📝 Add note',
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = e.currentTarget
    const data = {
      kind: (form.elements.namedItem('kind') as HTMLSelectElement).value,
      date: (form.elements.namedItem('date') as HTMLInputElement).value,
      summary: (form.elements.namedItem('summary') as HTMLTextAreaElement).value.trim(),
    }
    try {
      const res = await fetch(`/api/contacts/${contactId}/comms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      onClose()
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(13,32,53,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl w-full mx-4"
        style={{ maxWidth: 440, background: '#FBF7EF', border: '1px solid #E8E2D6', padding: '24px 24px 20px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ fontSize: 17, color: '#0D2035' }}>
            {kindLabel[defaultKind]}
          </h2>
          <button type="button" onClick={onClose} style={{ fontSize: 18, color: '#9AA5AC' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Kind */}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>Type</label>
            <select
              name="kind"
              defaultValue={defaultKind}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
            >
              <option value="call">📞 Call</option>
              <option value="email">✉ Email</option>
              <option value="meeting">🤝 Meeting</option>
              <option value="note">📝 Note</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>Date</label>
            <input
              name="date"
              type="date"
              defaultValue={todayISO()}
              required
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>Summary</label>
            <textarea
              name="summary"
              required
              rows={3}
              placeholder="What happened / what was discussed…"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#C0392B', background: '#FDECEA', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium"
              style={{ color: '#6B7A82', background: '#FFFFFF', border: '1px solid #E8E2D6' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: saving ? '#9AA5AC' : '#1E6B5E' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default function ContactActions({ contactId }: ContactActionsProps) {
  const [activeKind, setActiveKind] = useState<CommsKind | null>(null)

  return (
    <>
      <div className="flex items-center gap-2 flex-shrink-0">
        {([
          { kind: 'call' as CommsKind,    label: '📞 Log call' },
          { kind: 'email' as CommsKind,   label: '✉ Log email' },
          { kind: 'note' as CommsKind,    label: '📝 Add note' },
        ] as const).map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActiveKind(kind)}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold"
            style={{ background: '#E8F1EE', color: '#1E6B5E', border: '1px solid #C5DED8' }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeKind && (
        <LogModal
          contactId={contactId}
          defaultKind={activeKind}
          onClose={() => setActiveKind(null)}
        />
      )}
    </>
  )
}
