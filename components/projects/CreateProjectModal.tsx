'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { createProject } from '@/lib/mutations/projects'
import type { Stage } from '@/lib/types/database'

interface CreateProjectModalProps {
  onClose: () => void
}

const stageOptions: { stage: Stage; label: string; icon: string }[] = [
  { stage: 'inbox', label: 'Inbox', icon: '\uD83D\uDCE5' },
  { stage: 'someday', label: 'Someday', icon: '\uD83D\uDCA4' },
  { stage: 'exploring', label: 'Exploring', icon: '\uD83D\uDD0D' },
  { stage: 'building', label: 'Building', icon: '\uD83D\uDD28' },
]

export default function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [stage, setStage] = useState<Stage>('inbox')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !name.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      const project = await createProject({
        name: name.trim(),
        summary: summary.trim() || undefined,
        stage,
        created_by: user.id,
      })
      router.push(`/projects/${project.id}`)
    } catch (err) {
      console.error('Failed to create project:', err)
      setError(err instanceof Error ? err.message : 'Failed to create project. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-[#2C3E50]">New Project</h3>
          <button
            onClick={onClose}
            className="text-[#8899a6] text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-[#8899a6] mb-1">
              Project name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. VetBoard Analytics"
              className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 text-[#2C3E50] placeholder:text-[#8899a6]/60 focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]/30 focus:border-[#1E6B5E]"
              autoFocus
              required
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-[#8899a6] mb-1">
              One-line description
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Optional short description"
              className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 text-[#2C3E50] placeholder:text-[#8899a6]/60 focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]/30 focus:border-[#1E6B5E]"
            />
          </div>

          {/* Stage */}
          <div>
            <label className="block text-xs font-medium text-[#8899a6] mb-2">
              Starting stage
            </label>
            <div className="flex gap-2 flex-wrap">
              {stageOptions.map(({ stage: s, label, icon }) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    stage === s
                      ? 'bg-[#2C3E50] text-white'
                      : 'bg-white text-[#8899a6] border border-black/8'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#1E6B5E' }}
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}
