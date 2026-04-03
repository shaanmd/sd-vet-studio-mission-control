// components/projects/ProjectsClientWrapper.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NewProjectModal from './NewProjectModal'

export default function ProjectsClientWrapper() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl"
      >
        + New
      </button>
      {open && (
        <NewProjectModal
          onClose={() => setOpen(false)}
          onSubmit={async (values) => {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values),
            })
            if (!res.ok) throw new Error('Failed')
            const project = await res.json()
            setOpen(false)
            router.push(`/projects/${project.id}`)
            return project
          }}
        />
      )}
    </>
  )
}
