'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/use-auth'
import { createProject } from '@/lib/mutations/projects'
import { useRouter } from 'next/navigation'

export default function QuickActions() {
  const { user } = useAuth()
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!name.trim() || !user) return
    startTransition(async () => {
      await createProject({ name: name.trim(), created_by: user.id })
      setName('')
      setShowForm(false)
      router.refresh()
    })
  }

  return (
    <section>
      <h2
        className="text-[11px] uppercase tracking-[2px] font-semibold mb-3"
        style={{ color: '#D4A853' }}
      >
        Quick Actions
      </h2>

      <div className="grid grid-cols-3 gap-3">
        {/* Quick Add */}
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-white rounded-xl border border-black/8 p-4 text-center hover:shadow-sm transition-shadow"
        >
          <span className="text-2xl block mb-1">&#128229;</span>
          <span className="text-xs font-medium text-[#2C3E50]">Quick Add</span>
        </button>

        {/* All Projects */}
        <Link
          href="/projects"
          className="bg-white rounded-xl border border-black/8 p-4 text-center hover:shadow-sm transition-shadow"
        >
          <span className="text-2xl block mb-1">&#128194;</span>
          <span className="text-xs font-medium text-[#2C3E50]">All Projects</span>
        </Link>

        {/* Resources */}
        <Link
          href="/resources"
          className="bg-white rounded-xl border border-black/8 p-4 text-center hover:shadow-sm transition-shadow"
        >
          <span className="text-2xl block mb-1">&#128279;</span>
          <span className="text-xs font-medium text-[#2C3E50]">Resources</span>
        </Link>
      </div>

      {/* Inline Quick Add form */}
      {showForm && (
        <div className="mt-3 bg-white rounded-xl border border-black/8 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="New project name..."
              className="flex-1 text-sm border border-black/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]/30"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={isPending || !name.trim()}
              className="px-4 py-2 bg-[#1E6B5E] text-white text-sm font-medium rounded-lg hover:bg-[#1E6B5E]/90 disabled:opacity-50 transition-colors"
            >
              Add to Inbox
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
