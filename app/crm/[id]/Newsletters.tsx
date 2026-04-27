'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { NewsletterSubscription, NewsletterSourceTool } from '@/lib/types/database'

interface ListOption {
  id: string
  name: string
  active: number
}

const SOURCE_TOOLS: { value: NewsletterSourceTool; label: string }[] = [
  { value: 'resend',     label: 'Resend' },
  { value: 'beehiiv',    label: 'Beehiiv' },
  { value: 'convertkit', label: 'ConvertKit' },
  { value: 'systeme',    label: 'Systeme.io' },
  { value: 'manual',     label: 'Manual' },
]

interface Props {
  contactId: string
  initialSubscriptions: NewsletterSubscription[]
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Newsletters({ contactId, initialSubscriptions }: Props) {
  const router = useRouter()
  const [subs, setSubs] = useState<NewsletterSubscription[]>(initialSubscriptions)

  // add form state
  const [adding, setAdding] = useState(false)
  const [listName, setListName] = useState('')
  const [sourceTool, setSourceTool] = useState<NewsletterSourceTool>('resend')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // per-row state
  const [busyId, setBusyId] = useState<string | null>(null)

  // Real list options — pulled from /api/newsletter-lists when the form opens
  const [listOptions, setListOptions] = useState<ListOption[]>([])
  useEffect(() => {
    if (!adding) return
    fetch('/api/newsletter-lists')
      .then(r => r.ok ? r.json() : [])
      .then((data) => setListOptions(Array.isArray(data) ? data : []))
      .catch(() => setListOptions([]))
  }, [adding])

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!listName.trim()) { setError('List name required'); return }
    setSaving(true)
    setError('')
    const res = await fetch(`/api/contacts/${contactId}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        list_name: listName.trim(),
        source_tool: sourceTool,
        notes: notes.trim() || null,
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to subscribe')
      setSaving(false)
      return
    }
    const created: NewsletterSubscription = await res.json()
    // replace if exists, else prepend
    setSubs(prev => {
      const without = prev.filter(s => s.id !== created.id)
      return [created, ...without]
    })
    setListName('')
    setNotes('')
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  async function toggleSubscribe(sub: NewsletterSubscription) {
    setBusyId(sub.id)
    const isCurrentlySubscribed = sub.unsubscribed_at === null
    const patch = isCurrentlySubscribed
      ? { unsubscribed_at: new Date().toISOString() }
      : { unsubscribed_at: null, subscribed_at: new Date().toISOString() }

    const res = await fetch(`/api/contacts/${contactId}/subscriptions/${sub.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated: NewsletterSubscription = await res.json()
      setSubs(prev => prev.map(s => s.id === sub.id ? updated : s))
    }
    setBusyId(null)
    router.refresh()
  }

  async function handleDelete(sub: NewsletterSubscription) {
    if (!confirm(`Remove "${sub.list_name}" subscription record entirely?\n\nUse "Unsubscribe" instead if you want to keep history.`)) return
    setBusyId(sub.id)
    const res = await fetch(`/api/contacts/${contactId}/subscriptions/${sub.id}`, { method: 'DELETE' })
    if (res.ok) setSubs(prev => prev.filter(s => s.id !== sub.id))
    setBusyId(null)
    router.refresh()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* List */}
      {subs.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9AA5AC', marginBottom: 12 }}>
          Not subscribed to any newsletters yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 12 }}>
          {subs.map((sub, i) => {
            const subscribed = sub.unsubscribed_at === null
            return (
              <div
                key={sub.id}
                className="group"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: i < subs.length - 1 ? '1px solid #F5F0E8' : 'none',
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: subscribed ? '#E8F1EE' : '#F0EEEC',
                    color:      subscribed ? '#1E6B5E' : '#9AA5AC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 16,
                  }}
                >
                  📧
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0D2035' }}>
                      {sub.list_name}
                    </span>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '1px 6px', borderRadius: 999,
                        background: subscribed ? '#E8F1EE' : '#F0EEEC',
                        color:      subscribed ? '#1E6B5E' : '#9AA5AC',
                      }}
                    >
                      {subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </span>
                    <span style={{
                      fontSize: 10, color: '#6B7A82',
                      background: '#F5F0E8', borderRadius: 4, padding: '1px 5px',
                    }}>
                      {sub.source_tool}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#9AA5AC', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {subscribed
                      ? `Subscribed ${formatDate(sub.subscribed_at)}`
                      : `Unsubscribed ${sub.unsubscribed_at ? formatDate(sub.unsubscribed_at) : ''}`}
                    {sub.notes ? ` · ${sub.notes}` : ''}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleSubscribe(sub)}
                    disabled={busyId === sub.id}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '4px 8px', borderRadius: 6, border: '1px solid #E8E2D6',
                      background: '#fff', color: subscribed ? '#A07C2A' : '#1E6B5E',
                      cursor: 'pointer',
                    }}
                    title={subscribed ? 'Unsubscribe' : 'Resubscribe'}
                  >
                    {subscribed ? 'Unsubscribe' : 'Resubscribe'}
                  </button>
                  <button
                    onClick={() => handleDelete(sub)}
                    disabled={busyId === sub.id}
                    style={{
                      fontSize: 11, color: '#9AA5AC',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                    }}
                    title="Delete record"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add form */}
      <div style={{ borderTop: '1px solid #E8E2D6', paddingTop: 12 }}>
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            style={{
              fontSize: 12, fontWeight: 600, color: '#1E6B5E',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            + Subscribe to a list
          </button>
        ) : (
          <form onSubmit={handleSubscribe} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">List</label>
              <input
                value={listName}
                onChange={e => setListName(e.target.value)}
                placeholder="e.g. SynAlpseVet"
                list="newsletter-list-presets"
                className={inputCls}
                autoFocus
              />
              <datalist id="newsletter-list-presets">
                {listOptions.map(l => (
                  <option key={l.id} value={l.name}>
                    {l.active} active
                  </option>
                ))}
              </datalist>
              {listOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {listOptions.slice(0, 6).map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setListName(l.name)}
                      style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 999,
                        border: `1px solid ${listName === l.name ? '#1E6B5E' : '#E8E2D6'}`,
                        background: listName === l.name ? '#E8F4F0' : '#fff',
                        color: listName === l.name ? '#1E6B5E' : '#6B7A82',
                        cursor: 'pointer',
                      }}
                    >
                      {l.name} · {l.active}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Source tool</label>
              <div className="flex gap-1.5 flex-wrap">
                {SOURCE_TOOLS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSourceTool(t.value)}
                    className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors"
                    style={sourceTool === t.value
                      ? { background: '#E8F4F0', color: '#1E6B5E', borderColor: '#1E6B5E' }
                      : { borderColor: '#E8E2D6', color: '#6B7280' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className={inputCls}
            />

            {error && <p className="text-red-600 text-xs">{error}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setAdding(false); setError(''); setListName(''); setNotes('') }}
                style={{
                  flex: 1, fontSize: 12, fontWeight: 600,
                  padding: '7px 0', borderRadius: 8, border: '1px solid #E8E2D6',
                  background: '#fff', color: '#6B7A82', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !listName.trim()}
                style={{
                  flex: 2, fontSize: 12, fontWeight: 600,
                  padding: '7px 0', borderRadius: 8, border: 'none',
                  background: '#1E6B5E', color: '#fff', cursor: 'pointer',
                  opacity: saving || !listName.trim() ? 0.5 : 1,
                }}
              >
                {saving ? 'Subscribing…' : 'Subscribe'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
