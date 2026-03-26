'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { updateProjectSummary } from '@/lib/mutations/projects'

export default function ProjectSummary({
  projectId,
  summary,
}: {
  projectId: string
  summary: string | null
}) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(summary ?? '')
  const [saved, setSaved] = useState(summary ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await updateProjectSummary(projectId, text, user.id)
      setSaved(text)
      setEditing(false)
    } catch {
      alert('Failed to save summary.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-black/[0.08] p-4 mb-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-[80px] text-sm text-[#2C3E50] border border-black/10 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30 resize-none"
          autoFocus
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => {
              setText(saved)
              setEditing(false)
            }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-black/5 text-[#2C3E50]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-full text-left bg-white rounded-xl border border-black/[0.08] p-4 mb-4"
    >
      <p className="text-sm text-[#2C3E50]">
        {saved || (
          <span className="text-[#8899a6] italic">Tap to add a summary...</span>
        )}
      </p>
    </button>
  )
}
