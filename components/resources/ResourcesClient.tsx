'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Resource, ResourceCategory } from '@/lib/types/database'

const CATEGORIES: { value: ResourceCategory | 'all'; label: string; emoji: string }[] = [
  { value: 'all',       label: 'All',       emoji: '✦' },
  { value: 'dev',       label: 'Dev',        emoji: '🛠' },
  { value: 'ai',        label: 'AI Tools',   emoji: '🤖' },
  { value: 'marketing', label: 'Marketing',  emoji: '📣' },
  { value: 'business',  label: 'Business',   emoji: '💼' },
  { value: 'brand',     label: 'Brand',      emoji: '🎨' },
  { value: 'contacts',  label: 'Contacts',   emoji: '👥' },
]

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  dev:       { label: 'Dev & Deployment', emoji: '🛠' },
  ai:        { label: 'AI Tools',         emoji: '🤖' },
  marketing: { label: 'Marketing',        emoji: '📣' },
  business:  { label: 'Business',         emoji: '💼' },
  brand:     { label: 'Brand',            emoji: '🎨' },
  contacts:  { label: 'Contacts',         emoji: '👥' },
}

interface Props { resources: Resource[] }

export default function ResourcesClient({ resources }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<ResourceCategory | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [addName, setAddName] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [addDesc, setAddDesc] = useState('')
  const [addCat, setAddCat] = useState<ResourceCategory>('dev')
  const [addIcon, setAddIcon] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = filter === 'all' ? resources : resources.filter(r => r.category === filter)

  const grouped = filtered.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {} as Record<string, Resource[]>)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!addName.trim() || !addUrl.trim()) return
    setSaving(true)
    await fetch('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim(), url: addUrl.trim(), description: addDesc || null, category: addCat, icon: addIcon || '🔗' }),
    })
    setAddName(''); setAddUrl(''); setAddDesc(''); setAddIcon(''); setShowAdd(false); setSaving(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/resources/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <>
      {/* Filter pills + Add */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setFilter(c.value)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
              style={filter === c.value
                ? { background: '#1E2A35', color: '#fff' }
                : { background: '#fff', color: '#6B7A82', border: '1px solid #E8E2D6' }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white"
          style={{ background: '#1E6B5E' }}
        >
          + Add
        </button>
      </div>

      {/* Resource groups */}
      <div className="flex flex-col gap-6">
        {(filter === 'all' ? Object.keys(CATEGORY_LABELS) : [filter]).map(cat => {
          const items = grouped[cat]
          if (!items?.length) return null
          const meta = CATEGORY_LABELS[cat]
          return (
            <div key={cat}>
              <h2 className="text-[11px] font-bold uppercase tracking-[2px] mb-3" style={{ color: '#9AA5AC' }}>
                {meta.emoji} {meta.label}
              </h2>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {items.map(r => (
                  <div
                    key={r.id}
                    className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-shadow hover:shadow-sm"
                    style={{ background: '#fff', border: '1px solid #E8E2D6' }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                      style={{ background: '#F5F0E8' }}
                    >
                      {r.icon}
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate" style={{ color: '#1E2A35' }}>{r.name}</div>
                      {r.description && (
                        <div className="text-[11.5px] truncate mt-0.5" style={{ color: '#9AA5AC' }}>{r.description}</div>
                      )}
                    </a>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-[12px] opacity-40 hover:opacity-100 transition-opacity" style={{ color: '#1E6B5E' }}>
                        ↗
                      </a>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        style={{ color: '#9AA5AC' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center py-12 text-[13px] italic" style={{ color: '#9AA5AC' }}>No resources in this category yet.</p>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Add Resource</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 text-xl">×</button>
              </div>
              <form onSubmit={handleAdd} className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input value={addIcon} onChange={e => setAddIcon(e.target.value)} placeholder="🔗"
                    className="w-14 text-center border border-gray-200 rounded-lg px-2 py-2 text-sm" />
                  <input autoFocus value={addName} onChange={e => setAddName(e.target.value)} placeholder="Name *"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="URL *" type="url"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input value={addDesc} onChange={e => setAddDesc(e.target.value)} placeholder="Description (optional)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={addCat} onChange={e => setAddCat(e.target.value as ResourceCategory)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAdd(false)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
                  <button type="submit" disabled={saving || !addName.trim() || !addUrl.trim()}
                    className="flex-1 py-3 rounded-xl text-white font-medium disabled:opacity-50"
                    style={{ background: '#1E6B5E' }}>
                    {saving ? 'Saving…' : 'Add Resource'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
