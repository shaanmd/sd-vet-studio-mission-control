'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectLink } from '@/lib/types/database'

const LINK_ICONS: Record<string, string> = {
  github: '🐙', vercel: '▲', figma: '🎨', notion: '📝', drive: '📁',
  docs: '📄', slack: '💬', loom: '🎥', linear: '📋', stripe: '💳',
}

function guessIcon(url: string, label: string): string {
  const combined = (url + label).toLowerCase()
  for (const [key, icon] of Object.entries(LINK_ICONS)) {
    if (combined.includes(key)) return icon
  }
  return '🔗'
}

function normaliseUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return 'https://' + url
  return url
}

export default function KeyLinks({ projectId, links }: { projectId: string; links: ProjectLink[] }) {
  const router = useRouter()
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setAdding(true)
    const finalUrl = normaliseUrl(url.trim())
    const finalLabel = label.trim() || finalUrl.replace(/^https?:\/\//, '').split('/')[0]
    const icon = guessIcon(finalUrl, finalLabel)
    await fetch(`/api/projects/${projectId}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: finalLabel, url: finalUrl, icon }),
    })
    setLabel(''); setUrl(''); setShowForm(false); setAdding(false)
    router.refresh()
  }

  async function handleDelete(linkId: string) {
    setDeletingId(linkId)
    await fetch(`/api/projects/${projectId}/links?linkId=${linkId}`, { method: 'DELETE' })
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <span className="font-semibold text-[13px]" style={{ color: '#1E2A35' }}>Key Links</span>
        <button onClick={() => setShowForm(v => !v)} className="text-[12px] font-semibold" style={{ color: '#1E6B5E' }}>
          + Add
        </button>
      </div>

      {/* Inline add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid #F5F0E8' }}>
          <input
            autoFocus
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste URL (github.com, drive.google.com…)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Label (optional — auto-detected from URL)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowForm(false); setUrl(''); setLabel('') }}
              className="px-3 py-1.5 text-[12px] text-gray-400">Cancel</button>
            <button type="submit" disabled={adding || !url.trim()}
              className="flex-1 py-1.5 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
              style={{ background: '#1E6B5E' }}>
              {adding ? 'Saving…' : 'Save link'}
            </button>
          </div>
        </form>
      )}

      {links.length === 0 && !showForm && (
        <p className="px-4 py-4 text-[13px] italic" style={{ color: '#9AA5AC' }}>No links yet. Add GitHub, Figma, Drive…</p>
      )}

      <div className="grid grid-cols-2 gap-0">
        {links.map((link, i) => (
          <div
            key={link.id}
            className="group flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: i < links.length - 1 ? '1px solid #F5F0E8' : 'none' }}
          >
            <a href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-base shrink-0">{link.icon || '🔗'}</span>
              <span className="text-[13px] font-medium truncate" style={{ color: '#1E2A35' }}>{link.label}</span>
            </a>
            {!link.is_auto && (
              <button
                onClick={() => handleDelete(link.id)}
                disabled={deletingId === link.id}
                className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity shrink-0"
                style={{ color: '#9AA5AC' }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
