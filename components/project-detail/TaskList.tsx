'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { createTask, completeTask, setNextStep, assignTask } from '@/lib/mutations/tasks'
import type { Task, Profile } from '@/lib/types/database'

const ENERGY_ICONS: Record<string, string> = {
  high: '\u26A1',
  medium: '\u2615',
  low: '\uD83D\uDECB\uFE0F',
}

export default function TaskList({
  projectId,
  tasks,
  profiles,
}: {
  projectId: string
  tasks: Task[]
  profiles: Profile[]
}) {
  const router = useRouter()
  const { user } = useAuth()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [adding, setAdding] = useState(false)

  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed).slice(0, 5)

  async function handleAdd() {
    if (!newTitle.trim() || !user) return
    setAdding(true)
    try {
      await createTask({
        project_id: projectId,
        title: newTitle.trim(),
        assigned_to: newAssignee || undefined,
      })
      setNewTitle('')
      setNewAssignee('')
      setShowAddForm(false)
      router.refresh()
    } catch {
      alert('Failed to add task.')
    } finally {
      setAdding(false)
    }
  }

  async function handleComplete(taskId: string) {
    if (!user) return
    try {
      await completeTask(taskId, user.id)
      router.refresh()
    } catch {
      alert('Failed to complete task.')
    }
  }

  async function handleAssign(taskId: string, assignedTo: string | null) {
    try {
      await assignTask(taskId, assignedTo)
      router.refresh()
    } catch {
      alert('Failed to assign task.')
    }
  }

  async function handleSetNextStep(taskId: string) {
    try {
      await setNextStep(projectId, taskId)
      router.refresh()
    } catch {
      alert('Failed to set next step.')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
          Tasks ({activeTasks.length})
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-medium text-[#1E6B5E]"
        >
          + Add
        </button>
      </div>

      {showAddForm && (
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Task title..."
              className="flex-1 text-sm border border-black/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newTitle.trim()}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white disabled:opacity-50"
            >
              {adding ? '...' : 'Save'}
            </button>
          </div>
          <select
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            className="text-xs border border-black/10 rounded-lg px-2 py-1.5 text-[#2C3E50] bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B5E]/30"
          >
            <option value="">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        {activeTasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-lg ${
              task.is_next_step ? 'bg-[#D4A853]/10' : ''
            }`}
          >
            <button
              onClick={() => handleComplete(task.id)}
              className="w-4 h-4 shrink-0 rounded border border-black/20 hover:border-[#1E6B5E] transition-colors"
              aria-label={`Complete ${task.title}`}
            />
            <span className="text-sm text-[#2C3E50] flex-1 min-w-0 truncate">
              {task.title}
            </span>
            {task.is_next_step && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D4A853] text-white shrink-0">
                NEXT
              </span>
            )}
            {!task.is_next_step && (
              <button
                onClick={() => handleSetNextStep(task.id)}
                className="text-[#8899a6] hover:text-[#D4A853] text-xs shrink-0"
                aria-label={`Set "${task.title}" as next step`}
                title="Set as next step"
              >
                &rarr;
              </button>
            )}
            <select
              value={task.assigned_to ?? ''}
              onChange={(e) => handleAssign(task.id, e.target.value || null)}
              className="text-[10px] text-[#8899a6] shrink-0 bg-transparent border-none cursor-pointer focus:outline-none"
              title="Assign task"
            >
              <option value="">—</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {task.energy && (
              <span className="text-xs shrink-0">{ENERGY_ICONS[task.energy]}</span>
            )}
          </div>
        ))}
      </div>

      {completedTasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-black/5">
          <p className="text-[10px] uppercase tracking-wider text-[#8899a6] mb-1">Completed</p>
          <div className="space-y-1">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1 px-2">
                <span className="text-xs shrink-0">{'\u2705'}</span>
                <span className="text-sm text-[#8899a6] line-through flex-1 min-w-0 truncate">
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
