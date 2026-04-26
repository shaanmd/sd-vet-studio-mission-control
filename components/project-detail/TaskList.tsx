'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Task, Recurrence } from '@/lib/types/database'

type EnergyLevel = 'high' | 'medium' | 'low'
type Assignee = 'shaan' | 'deb' | 'both'

const ENERGY_OPTIONS: { value: EnergyLevel; emoji: string; label: string }[] = [
  { value: 'high', emoji: '⚡', label: 'High' },
  { value: 'medium', emoji: '☕', label: 'Med' },
  { value: 'low', emoji: '🛋️', label: 'Low' },
]

const ASSIGNEE_OPTIONS: { value: Assignee; label: string; bg: string; color: string }[] = [
  { value: 'shaan', label: 'S', bg: '#E8F1EE', color: '#1E6B5E' },
  { value: 'deb',   label: 'D', bg: '#EEE8F6', color: '#7B5EA8' },
  { value: 'both',  label: '👥', bg: '#F5F0E8', color: '#6B7A82' },
]

function AssigneeAvatar({ assignee }: { assignee: string | null }) {
  if (!assignee) return null
  const opt = ASSIGNEE_OPTIONS.find(o => o.value === assignee)
  if (!opt) return null
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold shrink-0"
      style={{ background: opt.bg, color: opt.color }}
      title={assignee === 'both' ? 'Both' : assignee.charAt(0).toUpperCase() + assignee.slice(1)}
    >
      {opt.label}
    </span>
  )
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'daily', label: '📅 Daily' },
  { value: 'weekly', label: '🔁 Weekly' },
  { value: 'monthly', label: '📆 Monthly' },
]

function dueDatePill(due: string | null) {
  if (!due) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(due); d.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const overdue = diff < 0
  const today_ = diff === 0
  return { label, overdue, today: today_ }
}

interface Props {
  projectId: string
  tasks: Task[]
  allProjects?: { id: string; name: string; emoji: string | null }[]
}

export default function TaskList({ projectId, tasks: initialTasks, allProjects = [] }: Props) {
  const router = useRouter()
  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newRecurrence, setNewRecurrence] = useState<Recurrence | ''>('')
  const [newAssignee, setNewAssignee] = useState<Assignee | ''>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editEnergy, setEditEnergy] = useState<EnergyLevel | ''>('')
  const [editRecurrence, setEditRecurrence] = useState<Recurrence | ''>('')
  const [editAssignee, setEditAssignee] = useState<Assignee | ''>('')
  const [editProjectId, setEditProjectId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [completingId, setCompletingId] = useState<string | null>(null)

  // Sync with server data, but preserve any locally-added tasks not yet reflected by server
  useEffect(() => {
    setLocalTasks(prev => {
      const serverIds = new Set(initialTasks.map(t => t.id))
      // Keep tasks that exist locally but aren't in server data yet (just saved, server lagging)
      const pendingLocal = prev.filter(t => !t.id.startsWith('optimistic-') && !serverIds.has(t.id))
      const optimistic = prev.filter(t => t.id.startsWith('optimistic-'))
      return [...initialTasks, ...pendingLocal, ...optimistic]
    })
  }, [initialTasks])

  const activeTasks = localTasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (a.is_next_step && !b.is_next_step) return -1
      if (!a.is_next_step && b.is_next_step) return 1
      const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity
      if (aDate !== bDate) return aDate - bDate
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
  const completedTasks = localTasks.filter(t => t.completed)

  function startEditing(task: Task) {
    setEditingId(task.id)
    setEditTitle(task.title)
    setEditDueDate(task.due_date ?? '')
    setEditEnergy((task.energy as EnergyLevel) ?? 'medium')
    setEditRecurrence((task.recurrence as Recurrence) ?? '')
    setEditAssignee((task.assigned_to as Assignee) ?? '')
    setEditProjectId(task.project_id)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)

    // Optimistic: show task immediately
    const optimisticTask: Task = {
      id: `optimistic-${Date.now()}`,
      title: newTitle.trim(),
      project_id: projectId,
      description: null,
      energy: newEnergy as Task['energy'],
      due_date: newDueDate || null,
      recurrence: (newRecurrence || null) as Task['recurrence'],
      recurrence_next_due: null,
      assigned_to: newAssignee || null,
      is_next_step: false,
      completed: false,
      completed_at: null,
      completed_by: null,
      sort_order: 0,
      is_shared: true,
      created_at: new Date().toISOString(),
    }
    setLocalTasks(prev => [...prev, optimisticTask])
    setNewTitle(''); setNewEnergy('medium'); setNewDueDate(''); setNewRecurrence(''); setNewAssignee('')
    setAdding(false); setSaving(false)

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: optimisticTask.title,
        project_id: projectId,
        energy: newEnergy,
        due_date: newDueDate || null,
        recurrence: newRecurrence || null,
        assigned_to: newAssignee || null,
      }),
    })

    if (res.ok) {
      const created = await res.json()
      // Replace optimistic task with real one
      setLocalTasks(prev => prev.map(t => t.id === optimisticTask.id ? created : t))
      router.refresh()
    } else {
      // Rollback
      setLocalTasks(prev => prev.filter(t => t.id !== optimisticTask.id))
    }
  }

  async function handleSaveEdit(taskId: string, originalProjectId: string) {
    if (!editTitle.trim()) { setEditingId(null); return }
    const movingProject = editProjectId && editProjectId !== originalProjectId
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle.trim(),
        due_date: editDueDate || null,
        energy: editEnergy || null,
        recurrence: editRecurrence || null,
        assigned_to: editAssignee || null,
        ...(movingProject && { project_id: editProjectId, is_next_step: false }),
      }),
    })
    setEditingId(null)
    router.refresh()
  }

  async function handleComplete(id: string) {
    setCompletingId(id)
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, completed_at: new Date().toISOString() }),
    })
    router.refresh(); setCompletingId(null)
  }

  async function handleUncomplete(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: false, completed_at: null }),
    })
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
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <span className="font-semibold text-[13px]" style={{ color: '#1E2A35' }}>
          Tasks <span style={{ color: '#9AA5AC', fontWeight: 400 }}>({activeTasks.length})</span>
        </span>
        <button
          onClick={() => setAdding(true)}
          className="text-[12px] font-semibold"
          style={{ color: '#1E6B5E' }}
        >
          + Add
        </button>
      </div>

      {activeTasks.length === 0 && !adding && (
        <p className="px-4 py-4 text-[13px]" style={{ color: '#9AA5AC' }}>No tasks yet.</p>
      )}

      {activeTasks.map(task => {
        const pill = dueDatePill(task.due_date)
        return (
          <div
            key={task.id}
            className="group px-4 py-2.5 flex items-start gap-2"
            style={{
              borderBottom: '1px solid #F5F0E8',
              background: task.is_next_step ? '#FFFDF7' : undefined,
            }}
          >
            {/* Next-step fire toggle */}
            <button
              onClick={() => handleToggleNextStep(task)}
              title={task.is_next_step ? 'Remove next step' : 'Set as next step'}
              className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded transition-colors"
            >
              <span style={{ filter: task.is_next_step ? 'none' : 'grayscale(1) opacity(0.3)', fontSize: 13 }}>🔥</span>
            </button>

            {/* Task content */}
            {editingId === task.id ? (
              <div className="flex-1 flex flex-col gap-2 py-1">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(task.id, task.project_id); if (e.key === 'Escape') setEditingId(null) }}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Assignee */}
                  <div className="flex gap-1">
                    {ASSIGNEE_OPTIONS.map(o => (
                      <button key={o.value} type="button"
                        onClick={() => setEditAssignee(editAssignee === o.value ? '' : o.value)}
                        className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all"
                        style={editAssignee === o.value
                          ? { background: o.color, color: '#fff', outline: `2px solid ${o.color}`, outlineOffset: 1 }
                          : { background: o.bg, color: o.color }}
                        title={o.value === 'both' ? 'Both' : o.value.charAt(0).toUpperCase() + o.value.slice(1)}
                      >{o.label}</button>
                    ))}
                  </div>
                  {/* Energy */}
                  <div className="flex gap-1">
                    {ENERGY_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => setEditEnergy(o.value)}
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors"
                        style={editEnergy === o.value ? { background: '#1E6B5E', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82' }}
                      >{o.emoji} {o.label}</button>
                    ))}
                  </div>
                  {/* Due date */}
                  <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-0.5 text-[11px]" />
                  {/* Recurrence */}
                  <select value={editRecurrence} onChange={e => setEditRecurrence(e.target.value as Recurrence | '')}
                    className="border border-gray-200 rounded-lg px-2 py-0.5 text-[11px]">
                    <option value="">No repeat</option>
                    {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                {/* Move to project */}
                {allProjects.length > 1 && (
                  <select
                    value={editProjectId}
                    onChange={e => setEditProjectId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[11px]"
                    style={{ color: editProjectId !== task.project_id ? '#1E6B5E' : '#6B7A82' }}
                  >
                    {allProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.emoji ? `${p.emoji} ` : ''}{p.name}
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(task.id, task.project_id)} className="text-[12px] font-semibold px-3 py-1 rounded-lg text-white" style={{ background: '#1E6B5E' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="text-[12px] text-gray-400 px-2">Cancel</button>
                  <button onClick={() => handleDelete(task.id)} className="text-[12px] text-red-400 px-2 ml-auto">Delete</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="text-[13px] cursor-pointer"
                      style={{ color: task.is_next_step ? '#1E2A35' : '#4B5563', fontWeight: task.is_next_step ? 600 : 400 }}
                      onDoubleClick={() => startEditing(task)}
                    >
                      {task.title}
                    </span>
                    <AssigneeAvatar assignee={task.assigned_to} />
                    {task.recurrence && (
                      <span className="text-[10px]" style={{ color: '#9AA5AC' }}>
                        {task.recurrence === 'daily' ? '📅' : task.recurrence === 'weekly' ? '🔁' : '📆'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.energy && (
                      <span className="text-[11px]" style={{ color: '#9AA5AC' }}>
                        {task.energy === 'high' ? '⚡' : task.energy === 'medium' ? '☕' : '🛋️'} {task.energy}
                      </span>
                    )}
                    {pill && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: pill.overdue ? '#FDECEA' : pill.today ? '#FBF3DE' : '#F5F0E8',
                          color: pill.overdue ? '#C0392B' : pill.today ? '#B7791F' : '#6B7A82',
                        }}
                      >
                        {pill.overdue && '⚠ '}{pill.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit button (hover) */}
                <button
                  onClick={() => startEditing(task)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-1.5 py-0.5 rounded"
                  style={{ color: '#9AA5AC' }}
                >
                  ✏
                </button>

                {/* Complete circle */}
                <button
                  onClick={() => handleComplete(task.id)}
                  className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5"
                  style={completingId === task.id ? { background: '#1E6B5E', borderColor: '#1E6B5E' } : { borderColor: '#CBD5E1' }}
                  title="Mark complete"
                >
                  {completingId === task.id && <span className="text-[10px] text-white">✓</span>}
                </button>
              </>
            )}
          </div>
        )
      })}

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="px-4 py-3 flex flex-col gap-2" style={{ borderTop: '1px solid #F5F0E8' }}>
          <input
            autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            placeholder="Task title…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {/* Assignee */}
            <div className="flex gap-1">
              {ASSIGNEE_OPTIONS.map(o => (
                <button key={o.value} type="button"
                  onClick={() => setNewAssignee(newAssignee === o.value ? '' : o.value)}
                  className="w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center transition-all"
                  style={newAssignee === o.value
                    ? { background: o.color, color: '#fff', outline: `2px solid ${o.color}`, outlineOffset: 1 }
                    : { background: o.bg, color: o.color }}
                  title={o.value === 'both' ? 'Both' : o.value.charAt(0).toUpperCase() + o.value.slice(1)}
                >{o.label}</button>
              ))}
            </div>
            {/* Energy */}
            <div className="flex gap-1">
              {ENERGY_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setNewEnergy(o.value)}
                  className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors"
                  style={newEnergy === o.value ? { background: '#1E6B5E', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82' }}
                >{o.emoji} {o.label}</button>
              ))}
            </div>
            <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-[11px]" />
            <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value as Recurrence | '')}
              className="border border-gray-200 rounded-lg px-2 py-1 text-[11px]">
              <option value="">No repeat</option>
              {RECURRENCE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAdding(false); setNewTitle('') }} className="px-3 py-1.5 text-sm text-gray-400">Cancel</button>
            <button type="submit" disabled={saving || !newTitle.trim()}
              className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#1E6B5E' }}
            >{saving ? 'Adding…' : 'Add task'}</button>
          </div>
        </form>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <details className="px-4 py-2" style={{ borderTop: '1px solid #F5F0E8' }}>
          <summary className="text-[11px] cursor-pointer select-none" style={{ color: '#9AA5AC' }}>
            ✓ {completedTasks.length} completed
          </summary>
          <div className="mt-2">
            {completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 py-1.5">
                <span className="w-6 shrink-0" />
                <span className="text-[12px] flex-1 line-through" style={{ color: '#9AA5AC' }}>{task.title}</span>
                <button onClick={() => handleUncomplete(task.id)} className="text-[11px] shrink-0" style={{ color: '#9AA5AC' }}>↩</button>
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: '#E8F4F0' }}>
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
