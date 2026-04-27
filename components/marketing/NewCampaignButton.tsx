'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface NewListOption {
  name: string
  active: number
}

const COMMON_LISTS = ['SD VetStudio Main', 'SynAlpseVet', 'Behind the Bit', 'VetRehab']

interface NewCampaignButtonProps {
  label?: string
}

export default function NewCampaignButton({ label = '+ New campaign' }: NewCampaignButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lists, setLists] = useState<NewListOption[]>([])
  const [listName, setListName] = useState('')
  const [subject, setSubject] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!open) return
    fetch('/api/newsletter-lists')
      .then(r => r.ok ? r.json() : [])
      .then((data) => setLists(Array.isArray(data) ? data : []))
      .catch(() => setLists([]))
  }, [open])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!listName.trim()) { setError('Pick or type a list'); return }
    setCreating(true)
    setError(null)
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        list_name: listName.trim(),
        subject: subject.trim(),
      }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Failed to create campaign')
      setCreating(false)
      return
    }
    const created = await res.json()
    setOpen(false)
    router.push(`/marketing/campaigns/${created.id}`)
  }

  // Combine known lists from API + common list names so user can always start typing
  const optionNames = Array.from(new Set([...lists.map(l => l.name), ...COMMON_LISTS]))

  const modal = open && mounted ? createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
      style={{ background: 'rgba(13,32,53,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        className="rounded-2xl w-full mx-4"
        style={{
          maxWidth: 460, background: '#FBF7EF', border: '1px solid #E8E2D6',
          padding: '24px 28px', marginTop: 80,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ fontSize: 18, color: '#0D2035' }}>New campaign</h2>
          <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#9AA5AC', cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
              Send to list <span style={{ color: '#C0392B' }}>*</span>
            </label>
            <input
              autoFocus
              value={listName}
              onChange={e => setListName(e.target.value)}
              placeholder="e.g. SD VetStudio Main"
              list="campaign-list-presets"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ border: '1px solid #E8E2D6', background: '#fff' }}
            />
            <datalist id="campaign-list-presets">
              {optionNames.map(name => {
                const meta = lists.find(l => l.name === name)
                return <option key={name} value={name} label={meta ? `${meta.active} active` : undefined} />
              })}
            </datalist>
            {lists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {lists.slice(0, 4).map(l => (
                  <button
                    key={l.name}
                    type="button"
                    onClick={() => setListName(l.name)}
                    style={{
                      fontSize: 11, fontWeight: 600,
                      padding: '3px 10px', borderRadius: 999,
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
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
              Subject <span style={{ fontWeight: 400, color: '#9AA5AC' }}>(can edit later)</span>
            </label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. April wins — what we shipped"
              className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ border: '1px solid #E8E2D6', background: '#fff' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#C0392B', background: '#FDECEA', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-2 text-sm font-medium"
              style={{ color: '#6B7A82', background: '#fff', border: '1px solid #E8E2D6' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ background: creating ? '#9AA5AC' : '#1E6B5E' }}
            >
              {creating ? 'Creating…' : 'Open composer →'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white"
        style={{ background: '#1E6B5E' }}
      >
        {label}
      </button>
      {modal}
    </>
  )
}
