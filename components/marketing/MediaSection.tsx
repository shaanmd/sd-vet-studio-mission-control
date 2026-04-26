'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MediaItem {
  id: string
  type: 'podcast' | 'press' | 'video' | 'social' | 'other'
  title: string
  outlet?: string | null
  url?: string | null
  date?: string | null
  notes?: string | null
}

const TYPE_CONFIG = {
  podcast:  { emoji: '🎙️', label: 'Podcast',      bg: '#EDE9FE', color: '#5B21B6' },
  press:    { emoji: '📰', label: 'Press / PR',    bg: '#FEF3C7', color: '#92400E' },
  video:    { emoji: '▶️', label: 'Video',         bg: '#FDECEA', color: '#C0392B' },
  social:   { emoji: '📲', label: 'Social media',  bg: '#E8F4F0', color: '#1E6B5E' },
  other:    { emoji: '🌐', label: 'Other',         bg: '#F3F4F6', color: '#6B7280' },
}

export default function MediaSection() {
  const router = useRouter()
  const [items, setItems] = useState<MediaItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Form state
  const [type, setType] = useState<MediaItem['type']>('podcast')
  const [title, setTitle] = useState('')
  const [outlet, setOutlet] = useState('')
  const [url, setUrl] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const res = await fetch('/api/media')
    if (res.ok) setItems(await res.json())
    setLoaded(true)
  }

  if (!loaded) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[13px] uppercase tracking-wide" style={{ color: '#6B7A82' }}>
            🎙️ Media
          </h2>
          <button
            onClick={load}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: '#F5F0E8', color: '#1E6B5E', border: '1px solid #E8E2D6' }}
          >
            Load media
          </button>
        </div>
        <div className="rounded-xl p-4 text-center text-[13px]" style={{ background: '#F5F0E8', color: '#9AA5AC' }}>
          Podcast appearances, press coverage, video features & more.
        </div>
      </div>
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: title.trim(), outlet: outlet || null, url: url || null, date: date || null, notes: notes || null }),
    })
    if (res.ok) {
      const created = await res.json()
      setItems(prev => [created, ...prev])
      setTitle(''); setOutlet(''); setUrl(''); setDate(''); setNotes('')
      setShowAdd(false)
    }
    setSaving(false)
  }

  const filtered = typeFilter === 'all' ? items : items.filter(i => i.type === typeFilter)

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-[13px] uppercase tracking-wide" style={{ color: '#6B7A82' }}>
            🎙️ Media
          </h2>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#9AA5AC' }}>
            {items.length}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white"
          style={{ background: '#1E6B5E' }}
        >
          + Add
        </button>
      </div>

      {/* Type filters */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button
          onClick={() => setTypeFilter('all')}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={typeFilter === 'all' ? { background: '#1E2A35', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82', border: '1px solid #E8E2D6' }}
        >
          All
        </button>
        {Object.entries(TYPE_CONFIG).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setTypeFilter(k)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={typeFilter === k ? { background: '#1E2A35', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82', border: '1px solid #E8E2D6' }}
          >
            {v.emoji} {v.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-[13px] text-center py-6" style={{ color: '#9AA5AC' }}>
          No media appearances yet. Add your first one!
        </p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map(item => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.other
          return (
            <div key={item.id} className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0" style={{ background: cfg.bg }}>
                {cfg.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: '#1E2A35' }}>{item.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px]" style={{ color: '#9AA5AC' }}>
                  {item.outlet && <span>{item.outlet}</span>}
                  {item.date && <><span>·</span><span>{new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span></>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: '#1E6B5E' }}>↗ View</a>
                  )}
                </div>
                {item.notes && <div className="text-[12px] mt-1" style={{ color: '#6B7A82' }}>{item.notes}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Add Media</h2>
            <form onSubmit={handleSave} className="flex flex-col gap-3">
              {/* Type */}
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setType(k as MediaItem['type'])}
                    className="px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors"
                    style={type === k ? { background: v.bg, color: v.color, borderColor: v.color } : { borderColor: '#E8E2D6', color: '#6B7280' }}
                  >
                    {v.emoji} {v.label}
                  </button>
                ))}
              </div>
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Title *" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={outlet} onChange={e => setOutlet(e.target.value)} placeholder="Outlet / show name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="URL (optional)" type="url" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
                <button type="submit" disabled={saving || !title.trim()} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
