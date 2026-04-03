// components/home/MoneyMovesList.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MoneyMove } from '@/lib/types/database'
import { sortMoneyMoves } from '@/lib/revenue'

const REVENUE_EMOJI: Record<string, string> = { high: '💰💰💰', medium: '💰💰', low: '💰' }
const ENERGY_EMOJI: Record<string, string> = { high: '⚡', medium: '☕', low: '🛋️' }

interface Props {
  moves: MoneyMove[]
  onComplete: (taskId: string) => Promise<void>
}

export default function MoneyMovesList({ moves, onComplete }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const sorted = sortMoneyMoves(moves)

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">🎉</div>
        <div className="text-sm">All caught up! Add tasks to projects to see money moves here.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {sorted.map(({ task, project }) => (
        <div key={task.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
          <button
            className="w-full text-left px-4 py-3 flex items-start gap-3"
            onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm truncate">{task.title}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                <span>{project.emoji} {project.name}</span>
                <span>{REVENUE_EMOJI[project.revenue_score]}</span>
                <span>{ENERGY_EMOJI[task.energy ?? 'medium']}</span>
                {task.is_next_step && (
                  <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium">NEXT</span>
                )}
              </div>
            </div>
          </button>
          {expandedId === task.id && (
            <div className="px-4 pb-3 flex gap-2 border-t border-gray-100 pt-2">
              <button
                disabled={completing === task.id}
                onClick={async () => {
                  setCompleting(task.id)
                  await onComplete(task.id)
                  setCompleting(null)
                  router.refresh()
                }}
                className="flex-1 bg-teal-700 text-white text-sm rounded-lg py-2 font-medium disabled:opacity-50"
              >
                {completing === task.id ? 'Saving…' : '✓ Done'}
              </button>
              <button
                onClick={() => setExpandedId(null)}
                className="flex-1 bg-gray-100 text-gray-600 text-sm rounded-lg py-2"
              >
                Skip
              </button>
              <button
                onClick={() => router.push(`/projects/${task.project_id}`)}
                className="flex-1 bg-gray-100 text-gray-600 text-sm rounded-lg py-2"
              >
                View →
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
