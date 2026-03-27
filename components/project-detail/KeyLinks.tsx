'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProjectLink, deleteProjectLink } from '@/lib/mutations/links'
import type { ProjectLink } from '@/lib/types/database'

export default function KeyLinks({
  projectId,
  links,
}: {
  projectId: string
  links: ProjectLink[]
}) {
  const router = useRouter()
  const [showAddForm, setShowAddForm] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [icon, setIcon] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!label.trim() || !url.trim()) return
    setAdding(true)
    try {
      await createProjectLink({
        project_id: projectId,
        label: label.trim(),
        url: url.trim(),
        icon: icon.trim() || undefined,
      })
      setLabel('')
      setUrl('')
      setIcon('')
      setShowAddForm(false)
      router.refresh()
    } catch {
      alert('Failed to add link.')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(linkId: string) {
    if (deletingId) return
    setDeletingId(linkId)
    try {
      await deleteProjectLink(linkId)
      router.refresh()
    } catch {
      alert('Failed to delete link.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          Key Links
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-medium text-[#1E6B5E]"
        >
          + Add
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-xl border border-black/[0.08] p-3 mb-2 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Icon"
              className="w-12 text-center text-sm border border-black/10 rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. GitHub Repo)"
              className="flex-1 text-sm border border-black/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30"
              autoFocus
            />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="https://..."
            className="w-full text-sm border border-black/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !label.trim() || !url.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white disabled:opacity-50"
            >
              {adding ? 'Saving...' : 'Save'}
            </button>
            {!adding && (
              <button
                onClick={() => {
                  setLabel('')
                  setUrl('')
                  setIcon('')
                  setShowAddForm(false)
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-black/5 text-[#2C3E50]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {links.length === 0 && !showAddForm && (
        <p className="text-sm text-[#8899a6] italic">No links yet.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="group relative flex items-center gap-2 bg-white rounded-xl border border-black/[0.08] p-3 hover:border-[#1E6B5E]/20 transition-colors"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              {link.icon && <span className="text-base">{link.icon}</span>}
              <span className="text-sm text-[#2C3E50] font-medium truncate">
                {link.label}
              </span>
            </a>
            {!link.is_auto && (
              <button
                onClick={() => handleDelete(link.id)}
                className="opacity-0 group-hover:opacity-100 text-[#8899a6] hover:text-red-500 text-xs transition-opacity"
                aria-label={`Delete ${link.label}`}
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
