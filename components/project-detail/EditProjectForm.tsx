'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types/database'

const STAGES = ['inbox', 'someday', 'exploring', 'building', 'live', 'maintenance', 'archived'] as const
const REVENUE_SCORES = ['low', 'medium', 'high'] as const

interface Props {
  project: Project
  onClose: () => void
}

export default function EditProjectForm({ project, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [emoji, setEmoji] = useState(project.emoji ?? '')
  const [stage, setStage] = useState(project.stage)
  const [summary, setSummary] = useState(project.summary ?? '')
  const [revenueScore, setRevenueScore] = useState(project.revenue_score)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), emoji: emoji || null, stage, summary: summary || null, revenue_score: revenueScore }),
    })
    if (!res.ok) { setError('Failed to save'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  async function handleDelete() {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    router.push('/projects')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Edit Project</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🐾" className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center" />
            <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Project name *" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="One-line summary" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <select value={stage} onChange={e => setStage(e.target.value as typeof stage)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={revenueScore} onChange={e => setRevenueScore(e.target.value as typeof revenueScore)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {REVENUE_SCORES.map(s => <option key={s} value={s}>{'💰'.repeat(s === 'low' ? 1 : s === 'medium' ? 2 : 3)} {s}</option>)}
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
          <button type="button" onClick={handleDelete} className="w-full py-2 text-red-500 text-sm font-medium">Delete project…</button>
        </form>
      </div>
    </div>
  )
}
