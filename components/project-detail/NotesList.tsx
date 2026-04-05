'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectNote } from '@/lib/types/database'

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

  async function handleEdit(noteId: string) {
    if (!editContent.trim()) return
    await fetch(`/api/projects/${projectId}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId, content: editContent.trim() }),
    })
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(noteId: string) {
    await fetch(`/api/projects/${projectId}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Notes</h3>
        <button onClick={() => setAdding(true)} className="text-sm text-teal-600 font-medium">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-3">
          <textarea
            autoFocus
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Write a note…"
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-500 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Add Note'}</button>
          </div>
        </form>
      )}

      {notes.length === 0 && !adding && <p className="text-gray-400 text-sm">No notes yet.</p>}

      {displayed.map(note => (
        <div key={note.id} className="py-2 border-b border-gray-50 last:border-0 group">
          {editingId === note.id ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 border border-gray-200 rounded-lg text-gray-500 text-sm">Cancel</button>
                <button onClick={() => handleEdit(note.id)} className="flex-1 py-1.5 bg-teal-700 text-white rounded-lg text-sm font-medium">Save</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-xs text-gray-400">
                  {note.author?.name ?? 'Auto'} · {new Date(note.created_at).toLocaleDateString('en-AU')}
                </p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(note.id); setEditContent(note.content) }}
                    className="text-xs text-gray-400 hover:text-teal-600 px-1"
                  >✏️</button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-1"
                  >🗑</button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

      {notes.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 text-xs text-teal-600 font-medium"
        >
          {showAll ? 'Show less' : `Show ${notes.length - 5} more…`}
        </button>
      )}
    </div>
  )
}
