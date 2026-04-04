'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MoneyMove } from '@/lib/types/database'
import { sortMoneyMoves } from '@/lib/revenue'

const REVENUE_EMOJI: Record<string, string> = { high: '💰💰💰', medium: '💰💰', low: '💰' }
const ENERGY_EMOJI: Record<string, string> = { high: '⚡', medium: '☕', low: '🛋️' }
const STORAGE_KEY = 'mc-moves-order'

interface Props {
  moves: MoneyMove[]
  onComplete: (taskId: string) => Promise<void>
}

// ── Sortable card ─────────────────────────────────────────────────────────────

function MoveCard({
  move,
  expanded,
  completing,
  onToggle,
  onComplete,
  onSkip,
  onView,
}: {
  move: MoneyMove
  expanded: boolean
  completing: boolean
  onToggle: () => void
  onComplete: () => void
  onSkip: () => void
  onView: () => void
}) {
  const { task, project } = move
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-stretch">
        {/* drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="px-2 flex items-center text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>

        {/* main content */}
        <button
          className="flex-1 text-left px-3 py-3 flex items-start gap-3"
          onClick={onToggle}
        >
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-800 text-sm truncate">{task.title}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
              <span>{project.emoji} {project.name}</span>
              <span>{REVENUE_EMOJI[project.revenue_score]}</span>
              <span>{ENERGY_EMOJI[task.energy ?? 'medium']}</span>
              {task.is_next_step && (
                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-medium">
                  NEXT
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {expanded && (
        <div className="px-4 pb-3 flex gap-2 border-t border-gray-100 pt-2">
          <button
            disabled={completing}
            onClick={onComplete}
            className="flex-1 bg-teal-700 text-white text-sm rounded-lg py-2 font-medium disabled:opacity-50"
          >
            {completing ? 'Saving…' : '✓ Done'}
          </button>
          <button
            onClick={onSkip}
            className="flex-1 bg-gray-100 text-gray-600 text-sm rounded-lg py-2"
          >
            Skip
          </button>
          <button
            onClick={onView}
            className="flex-1 bg-gray-100 text-gray-600 text-sm rounded-lg py-2"
          >
            View →
          </button>
        </div>
      )}
    </div>
  )
}

// ── List ──────────────────────────────────────────────────────────────────────

export default function MoneyMovesList({ moves, onComplete }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [ordered, setOrdered] = useState<MoneyMove[]>([])

  // Initialise: apply saved order from localStorage, fall back to smart sort
  useEffect(() => {
    const base = sortMoneyMoves(moves)
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      if (saved.length > 0) {
        const map = new Map(base.map(m => [m.task.id, m]))
        const reordered = saved.flatMap(id => (map.has(id) ? [map.get(id)!] : []))
        // append any new items not in saved order
        const savedSet = new Set(saved)
        base.forEach(m => { if (!savedSet.has(m.task.id)) reordered.push(m) })
        setOrdered(reordered)
        return
      }
    } catch {}
    setOrdered(base)
  }, [moves])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrdered(prev => {
      const oldIndex = prev.findIndex(m => m.task.id === active.id)
      const newIndex = prev.findIndex(m => m.task.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(m => m.task.id)))
      return next
    })
  }

  if (ordered.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">🎉</div>
        <div className="text-sm">All caught up! Add tasks to projects to see money moves here.</div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordered.map(m => m.task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ordered.map(move => (
            <MoveCard
              key={move.task.id}
              move={move}
              expanded={expandedId === move.task.id}
              completing={completing === move.task.id}
              onToggle={() => setExpandedId(expandedId === move.task.id ? null : move.task.id)}
              onComplete={async () => {
                setCompleting(move.task.id)
                await onComplete(move.task.id)
                setCompleting(null)
                router.refresh()
              }}
              onSkip={() => setExpandedId(null)}
              onView={() => router.push(`/projects/${move.task.project_id}`)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
