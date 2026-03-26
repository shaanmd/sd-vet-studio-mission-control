'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { addProjectNote } from '@/lib/mutations/notes'
import type { ProjectNote, Profile } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

export default function NotesLog({
  projectId,
  notes,
  profiles,
}: {
  projectId: string
  notes: ProjectNote[]
  profiles: Profile[]
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [content, setContent] = useState('')
  const [adding, setAdding] = useState(false)

  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const sorted = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  async function handleAdd() {
    if (!content.trim() || !user) return
    setAdding(true)
    try {
      await addProjectNote({
        project_id: projectId,
        author_id: user.id,
        content: content.trim(),
      })
      setContent('')
      setShowAddForm(false)
      router.refresh()
    } catch {
      alert('Failed to add note.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          Notes &amp; Log
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-medium text-[#1E6B5E]"
        >
          + Add Note
        </button>
      </div>

      {showAddForm && (
        <div className="mb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a note..."
            className="w-full min-h-[60px] text-sm border border-black/10 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30 resize-none"
            autoFocus
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAdd}
              disabled={adding || !content.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white disabled:opacity-50"
            >
              {adding ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setContent('')
                setShowAddForm(false)
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-black/5 text-[#2C3E50]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <p className="text-sm text-[#8899a6] italic">No notes yet.</p>
      )}

      <div className="space-y-3">
        {sorted.map((note) => {
          const author = profileMap.get(note.author_id)
          const isAuto = note.note_type !== 'note'

          return (
            <div key={note.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-[#2C3E50] text-xs">
                  {author?.name ?? 'Unknown'}
                </span>
                <span className="text-[10px] text-[#8899a6]">
                  {formatDistanceToNow(note.created_at)}
                </span>
              </div>
              <p className={isAuto ? 'text-[#8899a6] italic text-xs' : 'text-[#2C3E50]'}>
                {note.content}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
