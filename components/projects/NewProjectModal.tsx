// components/projects/NewProjectModal.tsx
'use client'
import { useState } from 'react'

type RevenueScore = 'low' | 'medium' | 'high'
type RevenueStream = 'course' | 'subscription' | 'inapp' | 'consulting' | 'sponsorship' | 'affiliate' | 'other'

interface Props {
  onClose: () => void
  onSubmit: (values: {
    name: string
    summary: string
    revenue_score: RevenueScore
    revenue_stream: RevenueStream | null
    stage: string
  }) => Promise<{ id: string }>
}

const REVENUE_STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course', label: '🎓 Course sales' },
  { value: 'subscription', label: '🔄 Subscription' },
  { value: 'inapp', label: '📱 In-app / tokens' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'sponsorship', label: '🤝 Sponsorship' },
  { value: 'affiliate', label: '🔗 Affiliate' },
  { value: 'other', label: '📦 Other' },
]

export default function NewProjectModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [revenueScore, setRevenueScore] = useState<RevenueScore>('medium')
  const [revenueStream, setRevenueStream] = useState<RevenueStream | null>(null)
  const [stage, setStage] = useState('inbox')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSubmit({ name: name.trim(), summary, revenue_score: revenueScore, revenue_stream: revenueStream, stage })
    } catch {
      setError('Failed to create project. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Project name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. VetScribe Pro tier"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">One-line description</label>
            <input
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Optional — what&apos;s this about?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Revenue potential</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as RevenueScore[]).map(score => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setRevenueScore(score)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    revenueScore === score
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  {{ low: '💰', medium: '💰💰', high: '💰💰💰' }[score]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Revenue stream</label>
            <select
              value={revenueStream ?? ''}
              onChange={e => setRevenueStream((e.target.value as RevenueStream) || null)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select stream…</option>
              {REVENUE_STREAMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Stage</label>
            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="inbox">📥 Inbox</option>
              <option value="someday">💤 Someday/Maybe</option>
              <option value="exploring">🔍 Exploring</option>
              <option value="building">🔨 Building</option>
              <option value="live">🟢 Live</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
