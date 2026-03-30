'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { ProjectWithDetails } from '@/lib/types/database'

interface KanbanCardProps {
  project: ProjectWithDetails
}

export default function KanbanCard({ project }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const nextStep = project.next_step

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl p-3 border cursor-grab active:cursor-grabbing ${
        project.pinned
          ? 'border-l-[3px] border-l-[#D4A853] border-t border-r border-b border-black/[0.06]'
          : 'border-black/[0.06]'
      } ${isDragging ? 'shadow-lg' : 'shadow-sm'}`}
      {...attributes}
      {...listeners}
    >
      <Link
        href={`/projects/${project.id}`}
        onClick={(e) => {
          if (isDragging) e.preventDefault()
        }}
        className="block"
      >
        <div className="text-[13px] font-semibold text-[#2C3E50] truncate">
          {project.emoji && <span className="mr-1">{project.emoji}</span>}
          {project.name}
        </div>
        {nextStep ? (
          <div className="text-[11px] text-[#D4A853] mt-1 truncate">
            &rarr; {nextStep.title}
          </div>
        ) : (
          <div className="text-[11px] text-[#8899a6] mt-1 italic">
            No next step
          </div>
        )}
        {nextStep?.assigned_to && (
          <div className="text-[10px] text-[#8899a6] mt-0.5">
            {nextStep.assigned_to}
          </div>
        )}
      </Link>
    </div>
  )
}
