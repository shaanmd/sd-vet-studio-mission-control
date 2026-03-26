'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { toggleProjectPin, updateProjectStage } from '@/lib/mutations/projects'
import type { Project, Stage } from '@/lib/types/database'
import { formatDate } from '@/lib/utils/dates'

const STAGES: { value: Stage; label: string }[] = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'someday', label: 'Someday' },
  { value: 'exploring', label: 'Exploring' },
  { value: 'building', label: 'Building' },
  { value: 'live', label: 'Live' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'archived', label: 'Archived' },
]

export default function ProjectHeader({ project }: { project: Project }) {
  const router = useRouter()
  const { user } = useAuth()
  const [showStageSelector, setShowStageSelector] = useState(false)
  const [currentStage, setCurrentStage] = useState<Stage>(project.stage)
  const [pinned, setPinned] = useState(project.pinned)
  const [pinLoading, setPinLoading] = useState(false)

  async function handleTogglePin() {
    if (!user) return
    setPinLoading(true)
    try {
      await toggleProjectPin(project.id, !pinned, user.id)
      setPinned(!pinned)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.toLowerCase().includes('max') || message.toLowerCase().includes('limit')) {
        alert('Maximum 3 pinned projects allowed.')
      } else {
        alert('Failed to update pin status.')
      }
    } finally {
      setPinLoading(false)
    }
  }

  async function handleStageChange(stage: Stage) {
    if (!user) return
    try {
      await updateProjectStage(project.id, stage, user.id)
      setCurrentStage(stage)
      setShowStageSelector(false)
      router.refresh()
    } catch {
      alert('Failed to update stage.')
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.back()}
          className="text-[#2C3E50] hover:text-[#1E6B5E] transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#2C3E50] truncate">
            {project.emoji && <span className="mr-1.5">{project.emoji}</span>}
            {project.name}
          </h1>
        </div>

        <button
          onClick={handleTogglePin}
          disabled={pinLoading}
          className="text-xl shrink-0"
          aria-label={pinned ? 'Unpin project' : 'Pin project'}
        >
          {pinned ? '\u2B50' : '\u2606'}
        </button>
      </div>

      <div className="flex items-center gap-2 ml-9">
        <button
          onClick={() => setShowStageSelector(!showStageSelector)}
          className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#1E6B5E]/10 text-[#1E6B5E]"
        >
          {currentStage}
        </button>
        <span className="text-[11px] text-[#8899a6]">
          Started {formatDate(project.created_at)}
        </span>
      </div>

      {showStageSelector && (
        <div className="flex flex-wrap gap-1.5 mt-3 ml-9">
          {STAGES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStageChange(s.value)}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                currentStage === s.value
                  ? 'bg-[#1E6B5E] text-white'
                  : 'bg-black/5 text-[#2C3E50] hover:bg-black/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
