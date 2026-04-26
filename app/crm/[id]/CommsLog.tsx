'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CommsLogEntry, CommsKind } from '@/lib/types/database'

interface CommsLogProps {
  contactId: string
  initialEntries: CommsLogEntry[]
}

const KIND_ICON: Record<CommsKind, string> = {
  email:   '📧',
  call:    '📞',
  meeting: '🤝',
  note:    '📝',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CommsLog({ contactId, initialEntries }: CommsLogProps) {
  const router = useRouter()
  const [openForm, setOpenForm] = useState<CommsKind | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, kind: CommsKind) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = e.currentTarget
    const data = {
      kind,
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
      setOpenForm(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm('Delete this entry?')) return
    setDeletingId(entryId)
    try {
      const res = await fetch(`/api/contacts/${contactId}/comms/${entryId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh()
    } catch {
      // silently handle
    } finally {
      setDeletingId(null)
    }
  }

  const quickLogButtons: { kind: CommsKind; label: string }[] = [
    { kind: 'email',   label: '+ Log email' },
    { kind: 'call',    label: '+ Log call' },
    { kind: 'note',    label: '+ Add note' },
  ]

  return (
    <div style={{ borderTop: '1px solid #E8E2D6' }}>
      {/* Quick log row */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-wrap"
        style={{ borderBottom: '1px solid #E8E2D6', background: '#FDFAF5' }}
      >
        {quickLogButtons.map(({ kind, label }) => (
          <button
            key={kind}
            type="button"
            onClick={() => setOpenForm(openForm === kind ? null : kind)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
            style={{
              background: openForm === kind ? '#1E6B5E' : '#E8F1EE',
              color: openForm === kind ? '#FFFFFF' : '#1E6B5E',
              border: '1px solid #C5DED8',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Inline form */}
      {openForm && (
        <form
          onSubmit={(e) => handleSubmit(e, openForm)}
          className="flex flex-col gap-3 px-4 py-4"
          style={{ background: '#F6F9F8', borderBottom: '1px solid #E8E2D6' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
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
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>Summary</label>
            <textarea
              name="summary"
              required
              rows={2}
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

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setOpenForm(null); setError(null) }}
              className="rounded-xl px-3 py-1.5 text-xs font-medium"
              style={{ color: '#6B7A82', background: '#FFFFFF', border: '1px solid #E8E2D6' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: saving ? '#9AA5AC' : '#1E6B5E' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Timeline */}
      {initialEntries.length === 0 ? (
        <div className="px-4 py-6 text-center" style={{ color: '#9AA5AC', fontSize: 13 }}>
          No comms logged yet. Use the buttons above to log a call, email, or note.
        </div>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: '#E8E2D6' }}>
          {initialEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 px-4 py-3 group"
              style={{ background: '#FFFFFF' }}
            >
              {/* Kind icon */}
              <div
                className="flex items-center justify-center rounded-full flex-shrink-0 mt-0.5"
                style={{ width: 28, height: 28, background: '#E8F1EE', fontSize: 13 }}
              >
                {KIND_ICON[entry.kind]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: '#1E6B5E',
                      background: '#E8F1EE',
                      padding: '1px 7px',
                      borderRadius: 999,
                    }}
                  >
                    {formatDate(entry.date)}
                  </span>
                  <span style={{ fontSize: 11, color: '#9AA5AC' }}>by {entry.logged_by}</span>
                </div>
                <p style={{ fontSize: 13, color: '#2A3A48', lineHeight: 1.5 }}>{entry.summary}</p>
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(entry.id)}
                disabled={deletingId === entry.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg px-2 py-1 text-xs flex-shrink-0"
                style={{ color: '#C0392B', background: '#FDECEA' }}
              >
                {deletingId === entry.id ? '…' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
