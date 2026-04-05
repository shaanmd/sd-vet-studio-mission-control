'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Task } from '@/lib/types/database'

interface Props {
  projectId: string
  tasks: Task[]
}

export default function TaskList({ projectId, tasks }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), project_id: projectId }),
    })
    setNewTitle('')
    setAdding(false)
    setSaving(false)
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

  const activeTasks = tasks.filter(t => !t.completed)
  const completedTasks = tasks.filter(t => t.completed)

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Tasks ({activeTasks.length})</h3>
        <button onClick={() => setAdding(true)} className="text-sm text-teal-600 font-medium">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="flex gap-2 mb-3">
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 text-gray-400 text-sm">✕</button>
          <button type="submit" disabled={saving} className="px-3 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">Add</button>
        </form>
      )}

      {activeTasks.length === 0 && !adding && <p className="text-gray-400 text-sm mb-2">No tasks yet.</p>}

      {activeTasks.map(task => (
        <div key={task.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 group">
          {editingId === task.id ? (
            <div className="flex gap-2 flex-1">
              <input
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEdit(task.id); if (e.key === 'Escape') setEditingId(null) }}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm"
              />
              <button onClick={() => handleEdit(task.id)} className="text-teal-600 text-sm font-medium">Save</button>
              <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm">✕</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleToggleNextStep(task)}
                title={task.is_next_step ? 'Unmark as next step' : 'Mark as next step'}
                className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-xs ${task.is_next_step ? 'bg-amber-400 border-amber-400 text-white' : 'border-gray-300'}`}
              >
                {task.is_next_step ? '→' : ''}
              </button>
              <span className="text-sm text-gray-800 flex-1 truncate">{task.title}</span>
              {task.is_next_step && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">NEXT</span>}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => { setEditingId(task.id); setEditTitle(task.title) }} className="text-xs text-gray-400 hover:text-teal-600 px-1">✏️</button>
                <button onClick={() => handleDelete(task.id)} className="text-xs text-gray-400 hover:text-red-500 px-1">🗑</button>
              </div>
            </>
          )}
        </div>
      ))}

      {completedTasks.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-400 cursor-pointer select-none">
            {completedTasks.length} completed
          </summary>
          {completedTasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 opacity-50">
              <div className="w-4 h-4 rounded border border-gray-300 bg-gray-100 shrink-0 flex items-center justify-center text-xs text-gray-400">✓</div>
              <span className="text-sm text-gray-500 line-through flex-1">{task.title}</span>
            </div>
          ))}
        </details>
      )}
    </div>
  )
}
