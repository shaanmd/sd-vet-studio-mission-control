'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { updateProjectStage } from '@/lib/mutations/projects'
import type { ProjectWithDetails, Stage } from '@/lib/types/database'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import UndoToast from './UndoToast'

const BOARD_COLUMNS: { stage: Stage; icon: string; label: string }[] = [
  { stage: 'exploring', icon: '\uD83D\uDD0D', label: 'Exploring' },
  { stage: 'building', icon: '\uD83D\uDD28', label: 'Building' },
  { stage: 'live', icon: '\uD83D\uDFE2', label: 'Live' },
  { stage: 'maintenance', icon: '\uD83D\uDD27', label: 'Maintenance' },
]

interface KanbanBoardProps {
  projects: ProjectWithDetails[]
}

export default function KanbanBoard({ projects }: KanbanBoardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    projectId: string
    previousStage: Stage
  } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const activeProject = activeId
    ? projects.find((p) => p.id === activeId) ?? null
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || !user) return

    const projectId = active.id as string
    const project = projects.find((p) => p.id === projectId)
    if (!project) return

    // The "over" target could be a column (stage name) or a card (project id)
    const targetStage = over.id as Stage
    const targetProject = projects.find((p) => p.id === targetStage)
    const newStage = targetProject ? targetProject.stage : targetStage

    if (!BOARD_COLUMNS.some((c) => c.stage === newStage)) return
    if (newStage === project.stage) return

    const previousStage = project.stage
    const columnMeta = BOARD_COLUMNS.find((c) => c.stage === newStage)

    try {
      await updateProjectStage(projectId, newStage, user.id)

      setToast({
        message: `Moved "${project.name}" to ${columnMeta?.label ?? newStage}`,
        projectId,
        previousStage,
      })

      router.refresh()
    } catch {
      alert('Failed to move project.')
    }
  }

  const handleUndo = useCallback(async () => {
    if (!toast || !user) return
    try {
      await updateProjectStage(toast.projectId, toast.previousStage, user.id)
      setToast(null)
      router.refresh()
    } catch {
      alert('Failed to undo.')
    }
  }, [toast, user, router])

  const handleDismissToast = useCallback(() => {
    setToast(null)
  }, [])

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.stage}
              stage={col.stage}
              icon={col.icon}
              label={col.label}
              projects={projects.filter((p) => p.stage === col.stage)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeProject ? (
            <div className="rotate-2 opacity-90">
              <KanbanCard project={activeProject} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {toast && (
        <UndoToast
          message={toast.message}
          onUndo={handleUndo}
          onDismiss={handleDismissToast}
        />
      )}
    </>
  )
}
