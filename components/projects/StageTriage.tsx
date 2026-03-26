'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { updateProjectStage } from '@/lib/mutations/projects'
import type { Stage } from '@/lib/types/database'

interface StageTriageProps {
  projectId: string
  projectName: string
  onClose: () => void
  onSuccess: () => void
}

const triageOptions: { stage: Stage; label: string; icon: string }[] = [
  { stage: 'someday', label: 'Someday/Maybe', icon: '\uD83D\uDCA4' },
  { stage: 'exploring', label: 'Exploring', icon: '\uD83D\uDD0D' },
  { stage: 'building', label: 'Building', icon: '\uD83D\uDD28' },
  { stage: 'live', label: 'Live', icon: '\uD83D\uDFE2' },
  { stage: 'maintenance', label: 'Maintenance', icon: '\uD83D\uDD27' },
  { stage: 'archived', label: 'Archive', icon: '\uD83D\uDDC4\uFE0F' },
]

export default function StageTriage({ projectId, projectName, onClose, onSuccess }: StageTriageProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleSelect(stage: Stage) {
    if (!user) return
    setLoading(true)
    try {
      await updateProjectStage(projectId, stage, user.id)
      onSuccess()
    } catch (err) {
      console.error('Failed to update stage:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-6 pb-8 sm:pb-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-[#2C3E50]">
            Sort: {projectName}
          </h3>
          <button
            onClick={onClose}
            className="text-[#8899a6] text-lg leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {triageOptions.map(({ stage, label, icon }) => (
            <button
              key={stage}
              onClick={() => handleSelect(stage)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-3 rounded-xl border border-black/8 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-[#2C3E50] disabled:opacity-50"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
