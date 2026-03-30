'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ProjectWithDetails, Stage } from '@/lib/types/database'
import KanbanCard from './KanbanCard'

interface KanbanColumnProps {
  stage: Stage
  icon: string
  label: string
  projects: ProjectWithDetails[]
}

export default function KanbanColumn({ stage, icon, label, projects }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex-1 min-w-[200px]">
      <div className="text-[10px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2 flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{label}</span>
        <span className="text-[#8899a6] font-normal">({projects.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-[120px] rounded-xl p-2 transition-colors space-y-2 ${
          isOver ? 'bg-[#1E6B5E]/5 ring-2 ring-[#1E6B5E]/20' : 'bg-black/[0.02]'
        }`}
      >
        <SortableContext
          items={projects.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <KanbanCard key={project.id} project={project} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
