'use client'
import { useState } from 'react'
import type { Project } from '@/lib/types/database'
import EditProjectForm from './EditProjectForm'

interface Props { project: Project }

export default function ProjectEditButton({ project }: Props) {
  const [editing, setEditing] = useState(false)
  return (
    <>
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-gray-400 hover:text-teal-600 font-medium px-2 py-1 rounded-lg hover:bg-gray-50"
      >
        ✏️ Edit
      </button>
      {editing && <EditProjectForm project={project} onClose={() => setEditing(false)} />}
    </>
  )
}
