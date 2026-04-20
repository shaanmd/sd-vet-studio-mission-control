'use client'

import { useState, useTransition } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { completePersonalTask, createPersonalTask } from '@/lib/mutations/personal-tasks'
import type { PersonalTaskWithProject, Profile } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

interface YourNext3Props {
  debTasks: PersonalTaskWithProject[]
  shaanTasks: PersonalTaskWithProject[]
  profiles: Profile[]
}

export default function YourNext3({ debTasks, shaanTasks, profiles }: YourNext3Props) {
  const { profile } = useAuth()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const debProfile = profiles.find((p) => p.name === 'Deb')
  const shaanProfile = profiles.find((p) => p.name === 'Shaan')

  const defaultTab = profile?.name === 'Shaan' ? 'Shaan' : 'Deb'
  const [activeTab, setActiveTab] = useState<'Deb' | 'Shaan'>(defaultTab)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const tasks = activeTab === 'Deb' ? debTasks : shaanTasks
  const otherTasks = activeTab === 'Deb' ? shaanTasks : debTasks
  const otherName = activeTab === 'Deb' ? 'Shaan' : 'Deb'

  const activeProfile = activeTab === 'Deb' ? debProfile : shaanProfile
  const isMyTab = profile?.name === activeTab

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !activeProfile) return
    await createPersonalTask({ title: newTitle.trim(), owner_id: activeProfile.id })
    setNewTitle('')
    setAdding(false)
    router.refresh()
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      await completePersonalTask(id)
      router.refresh()
    })
  }

  function hasOverlap(projectId: string | null): boolean {
    if (!projectId) return false
    return otherTasks.some((t) => t.project_id === projectId)
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-[11px] uppercase tracking-[2px] font-semibold"
          style={{ color: '#D4A853' }}
        >
          Your Next 3
        </h2>
        {isMyTab && tasks.length < 3 && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-medium"
            style={{ color: '#1E6B5E' }}
          >
            + Add
          </button>
        )}
      </div>

      {/* Toggle pills */}
      <div className="flex gap-1 mb-3">
        {(['Deb', 'Shaan'] as const).map((name) => (
          <button
            key={name}
            onClick={() => setActiveTab(name)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeTab === name
                ? 'bg-[#1E6B5E] text-white'
                : 'bg-white text-[#8899a6] border border-black/8 hover:text-[#2C3E50]'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border border-black/8 divide-y divide-black/5">
        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-[#8899a6]">
              No tasks yet. Add your top 3 priorities!
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 px-4 py-3">
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isPending}
                className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-[#1E6B5E] hover:bg-[#1E6B5E]/10 transition-colors disabled:opacity-50"
                aria-label={`Complete "${task.title}"`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#2C3E50] leading-snug">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {task.project && (
                    <span className="text-xs text-[#8899a6]">
                      {task.project.emoji && `${task.project.emoji} `}
                      {task.project.name}
                    </span>
                  )}
                  {hasOverlap(task.project_id) && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#D4A853]/15 text-[#b45309] font-medium">
                      {otherName} too
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Inline add form */}
      {adding && (
        <form onSubmit={handleAdd} className="mt-2 flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="What's your next priority?"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: '#1E6B5E' }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewTitle('') }}
            className="px-2 text-gray-400 text-sm"
          >
            ✕
          </button>
        </form>
      )}
    </section>
  )
}
