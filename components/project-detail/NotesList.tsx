'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectNote } from '@/lib/types/database'

function formatNoteTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return `yesterday at ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`
  if (diffDays < 7)   return `${diffDays} days ago`
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: diffDays > 365 ? 'numeric' : undefined })
}

interface NoteWithAuthor extends ProjectNote {
  author?: { name: string } | null
}

interface Props {
  projectId: string
  notes: NoteWithAuthor[]
}

export default function NotesList({ projectId, notes }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const displayed = showAll ? notes : notes.slice(0, 5)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newContent.trim()) return
    setSaving(true)
    await fetch(`/api/projects/${projectId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent.trim() }),
    })
    setNewContent('')
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  async function handleSaveEdit(noteId: string) {
    if (!editContent.trim()) { setEditingId(null); return }
    await fetch(`/api/projects/${projectId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, content: editContent.trim() }),
    })
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(noteId: string) {
    setDeletingId(noteId)
    await fetch(`/api/projects/${projectId}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    setDeletingId(null)
    router.refresh()
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <span className="font-semibold text-[13px]" style={{ color: '#1E2A35' }}>
          Notes <span style={{ color: '#9AA5AC', fontWeight: 400 }}>({notes.length})</span>
        </span>
        <button onClick={() => { setAdding(true); setEditingId(null) }} className="text-[12px] font-semibold" style={{ color: '#1E6B5E' }}>
          + Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid #F5F0E8' }}>
          <textarea
            autoFocus
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewContent('') } }}
            placeholder="Write a note…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAdding(false); setNewContent('') }}
              className="px-3 py-1.5 text-sm text-gray-400">Cancel</button>
            <button type="submit" disabled={saving || !newContent.trim()}
              className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#1E6B5E' }}
            >{saving ? 'Saving…' : 'Add note'}</button>
          </div>
        </form>
      )}

      {notes.length === 0 && !adding && (
        <p className="px-4 py-4 text-[13px]" style={{ color: '#9AA5AC' }}>No notes yet.</p>
      )}

      {displayed.map((note, i) => (
        <div
          key={note.id}
          className="group px-4 py-3"
          style={{ borderBottom: i < displayed.length - 1 ? '1px solid #F5F0E8' : 'none' }}
        >
          {editingId === note.id ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Escape') setEditingId(null)
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveEdit(note.id)
                }}
                rows={3}
                className="w-full border border-teal-300 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(note.id)}
                  disabled={deletingId === note.id}
                  className="text-[12px] px-2 py-1 rounded-lg"
                  style={{ color: '#C0392B' }}
                >Delete</button>
                <button onClick={() => setEditingId(null)} className="text-[12px] px-3 py-1 rounded-lg text-gray-400">Cancel</button>
                <button onClick={() => handleSaveEdit(note.id)}
                  className="flex-1 py-1 rounded-lg text-[12px] font-semibold text-white"
                  style={{ background: '#1E6B5E' }}>Save</button>
              </div>
            </div>
          ) : (
            <>
              <p
                className="text-[13px] whitespace-pre-wrap cursor-text hover:bg-black/[0.03] rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors"
                style={{ color: '#1E2A35' }}
                onClick={() => { setEditingId(note.id); setEditContent(note.content); setAdding(false) }}
                title="Click to edit"
              >
                {note.content}
              </p>
              <p className="text-[11px] mt-1.5 px-0" style={{ color: '#9AA5AC' }}>
                {note.author?.name ?? 'Auto'} · {formatNoteTime(note.created_at)}
              </p>
            </>
          )}
        </div>
      ))}

      {notes.length > 5 && (
        <div className="px-4 py-2" style={{ borderTop: '1px solid #F5F0E8' }}>
          <button onClick={() => setShowAll(!showAll)} className="text-[12px] font-medium" style={{ color: '#1E6B5E' }}>
            {showAll ? 'Show less' : `Show ${notes.length - 5} more…`}
          </button>
        </div>
      )}
    </div>
  )
}
