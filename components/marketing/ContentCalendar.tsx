// components/marketing/ContentCalendar.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentItem } from '@/lib/types/database'

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  email: '📧',
  youtube: '▶️',
  other: '📣',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
}

interface ContentWithProject extends ContentItem {
  project: { name: string; emoji: string } | null
}

interface Props {
  items: ContentWithProject[]
  projects: Array<{ id: string; name: string; emoji: string }>
}

export default function ContentCalendar({ items, projects }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [projectId, setProjectId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSaving(true)
    await fetch('/api/marketing/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, platform, project_id: projectId || null, scheduled_date: scheduledDate || null }),
    })
    setDescription('')
    setProjectId('')
    setScheduledDate('')
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/marketing/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Content Calendar</h2>
        <button onClick={() => setAdding(true)} className="text-sm text-teal-600 font-medium">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 mb-3 flex flex-col gap-2">
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's the content?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {Object.entries(PLATFORM_EMOJI).map(([v, e]) => <option key={v} value={v}>{e} {v}</option>)}
            </select>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>
          <input
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">{PLATFORM_EMOJI[item.platform]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 font-medium">{item.description}</div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                {item.project && <span>{item.project.emoji} {item.project.name}</span>}
                {item.scheduled_date && <span>· {new Date(item.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
              </div>
            </div>
            <select
              value={item.status}
              onChange={e => handleStatusChange(item.id, e.target.value)}
              className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${STATUS_STYLE[item.status]}`}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No content planned yet.</p>}
      </div>
    </div>
  )
}
