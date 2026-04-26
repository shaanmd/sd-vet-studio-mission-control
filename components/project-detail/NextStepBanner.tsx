'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@/lib/types/database'

const ENERGY_LABEL: Record<string, { emoji: string; label: string; bg: string; color: string }> = {
  high:   { emoji: '⚡', label: 'High energy', bg: '#FDECEA', color: '#C0392B' },
  medium: { emoji: '☕', label: 'Medium',      bg: '#FDF3E0', color: '#B7791F' },
  low:    { emoji: '🛋️', label: 'Low energy',  bg: '#EAF3F0', color: '#276749' },
}

export default function NextStepBanner({ task }: { task: Task | null }) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)

  async function handleMarkDone() {
    if (!task) return
    setCompleting(true)
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, completed_at: new Date().toISOString() }),
    })
    router.refresh()
    setCompleting(false)
  }

  if (!task) {
    return (
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: '#FBF3DE', border: '1.5px dashed #EFDDB0', color: '#9AA5AC' }}
      >
        No next step set — mark a task below as 🔥 to set it.
      </div>
    )
  }

  const energy = ENERGY_LABEL[task.energy ?? 'medium']

  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{ background: '#FBF3DE', border: '1.5px solid #EFDDB0' }}
    >
      <span className="text-[13px] font-bold shrink-0" style={{ color: '#B7791F' }}>→</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: '#B7791F' }}>
          Next Step
        </div>
        <div className="text-sm font-semibold truncate" style={{ color: '#1E2A35' }}>{task.title}</div>
      </div>
      <span
        className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: energy.bg, color: energy.color }}
      >
        {energy.emoji} {energy.label}
      </span>
      <button
        onClick={handleMarkDone}
        disabled={completing}
        className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        style={{ background: '#1E6B5E', color: '#fff' }}
      >
        {completing ? '…' : '✓ Done'}
      </button>
    </div>
  )
}
