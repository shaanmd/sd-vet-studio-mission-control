'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@/lib/types/database'

type EnergyLevel = 'high' | 'medium' | 'low'

const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string }[] = [
  { value: 'high', label: 'High', emoji: '⚡' },
  { value: 'medium', label: 'Med', emoji: '☕' },
  { value: 'low', label: 'Low', emoji: '🛋️' },
]

interface Props {
  projectId: string
  tasks: Task[]
}

export default function TaskList({ projectId, tasks }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const activeTasks = tasks
    .filter((t) => !t.completed)
    .sort((a, b) => {
      if (a.is_next_step && !b.is_next_step) return -1
      if (!a.is_next_step && b.is_next_step) return 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  const completedTasks = tasks.filter((t) => t.completed)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle.trim(),
        project_id: projectId,
        energy: newEnergy,
      }),
    })
    setNewTitle('')
    setNewEnergy('medium')
    setAdding(false)
    setSaving(false)
    router.refresh()
  }

  async function handleComplete(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completed: true,
        completed_at: new Date().toISOString(),
      }),
    })
    router.refresh()
  }

  async function handleEdit(id: string) {
    if (!editTitle.trim()) return
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() }),
    })
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  async function handleToggleNextStep(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_next_step: !task.is_next_step }),
    })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Tasks ({activeTasks.length})</h3>
        <button
          onClick={() => setAdding(true)}
          className="text-sm font-medium"
          style={{ color: '#1E6B5E' }}
        >
          + Add
        </button>
      </div>

      {activeTasks.length === 0 && !adding && (
        <p className="text-gray-400 text-sm mb-2">No tasks yet.</p>
      )}

      {activeTasks.map((task) => (
        <div
          key={task.id}
          className={`group flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 ${
            task.is_next_step ? 'border-l-2 pl-2 -ml-2' : ''
          }`}
          style={task.is_next_step ? { borderLeftColor: '#D4A853' } : {}}
        >
          {/* 🔥 next-step toggle — always visible */}
          <button
            onClick={() => handleToggleNextStep(task)}
            title={task.is_next_step ? 'Remove next step' : 'Mark as next step'}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            style={task.is_next_step ? { backgroundColor: '#D4A85320' } : {}}
          >
            <span
              className="text-base leading-none"
              style={{ filter: task.is_next_step ? 'none' : 'grayscale(1) opacity(0.35)' }}
            >
              🔥
            </span>
          </button>

          {/* Task content */}
          {editingId === task.id ? (
            <div className="flex gap-2 flex-1">
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit(task.id)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
              />
              <button onClick={() => handleEdit(task.id)} className="text-sm font-medium" style={{ color: '#1E6B5E' }}>Save</button>
              <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">✕</button>
            </div>
          ) : (
            <>
              <span
                className="text-sm flex-1 truncate"
                style={{ color: task.is_next_step ? '#2C3E50' : '#4B5563', fontWeight: task.is_next_step ? 500 : 400 }}
                onDoubleClick={() => { setEditingId(task.id); setEditTitle(task.title) }}
              >
                {task.title}
              </span>

              {task.is_next_step && (
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: '#D4A85320', color: '#b45309' }}
                >
                  NEXT
                </span>
              )}

              {task.energy && (
                <span className="text-xs text-gray-400 shrink-0">
                  {task.energy === 'high' ? '⚡' : task.energy === 'medium' ? '☕' : '🛋️'}
                </span>
              )}

              <button
                onClick={() => handleDelete(task.id)}
                className="text-xs text-gray-300 hover:text-red-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                title="Delete task"
              >
                ✕
              </button>

              <button
                onClick={() => handleComplete(task.id)}
                className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors hover:border-teal-600 hover:bg-teal-50"
                style={{ borderColor: '#CBD5E1' }}
                title="Mark complete"
                aria-label={`Complete "${task.title}"`}
              >
                <span className="sr-only">Complete</span>
              </button>
            </>
          )}
        </div>
      ))}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task title…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Energy</span>
            <div className="flex gap-1">
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewEnergy(opt.value)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    newEnergy === opt.value
                      ? { backgroundColor: '#1E6B5E', color: 'white' }
                      : { backgroundColor: '#F3F4F6', color: '#6B7280' }
                  }
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setAdding(false); setNewTitle(''); setNewEnergy('medium') }}
              className="px-3 py-2 text-gray-400 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newTitle.trim()}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#1E6B5E' }}
            >
              {saving ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      )}

      {completedTasks.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-gray-400 cursor-pointer select-none">
            ✓ {completedTasks.length} completed
          </summary>
          <div className="mt-2 space-y-0">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 py-1.5 opacity-40">
                <span className="w-7 shrink-0" />
                <span className="text-sm text-gray-500 line-through flex-1">{task.title}</span>
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#1E6B5E20' }}
                >
                  <span className="text-[10px]" style={{ color: '#1E6B5E' }}>✓</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
