// components/projects/NewProjectModal.tsx
'use client'
import { useState } from 'react'

type RevenueScore = 'low' | 'medium' | 'high'
type RevenueStream = 'course' | 'subscription' | 'inapp' | 'consulting' | 'website_builds' | 'sponsorship' | 'affiliate' | 'other'

interface Props {
  onClose: () => void
  onSubmit: (values: {
    name: string
    summary: string
    revenue_score: RevenueScore
    revenue_stream: RevenueStream[]
    stage: string
  }) => Promise<{ id: string }>
}

const REVENUE_STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course', label: '🎓 Course' },
  { value: 'subscription', label: '🔄 Subscription' },
  { value: 'inapp', label: '📱 In-app' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'website_builds', label: '🌐 Website builds' },
  { value: 'sponsorship', label: '🤝 Sponsorship' },
  { value: 'affiliate', label: '🔗 Affiliate' },
  { value: 'other', label: '📦 Other' },
]

export default function NewProjectModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [revenueScore, setRevenueScore] = useState<RevenueScore>('medium')
  const [revenueStreams, setRevenueStreams] = useState<RevenueStream[]>([])

  function toggleStream(s: RevenueStream) {
    setRevenueStreams(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }
  const [stage, setStage] = useState('inbox')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    setSaving(true)
    setError('')
    try {
      await onSubmit({ name: name.trim(), summary, revenue_score: revenueScore, revenue_stream: revenueStreams, stage })
    } catch {
      setError('Failed to create project. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
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
            <label className="text-sm font-medium text-gray-700 block mb-1">Revenue stream <span className="text-gray-400 font-normal">(select all that apply)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {REVENUE_STREAMS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleStream(s.value)}
                  className="px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors"
                  style={revenueStreams.includes(s.value)
                    ? { background: '#1E6B5E', color: '#fff' }
                    : { background: '#F5F0E8', color: '#6B7A82', border: '1px solid #E8E2D6' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Stage</label>
            <select
              value={stage}
              onChange={e => setStage(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="inbox">📥 Inbox</option>
              <option value="someday">💤 Someday</option>
              <option value="exploring">🔍 Exploring</option>
              <option value="building">🔨 Building</option>
              <option value="beta">🧪 Beta/Testing</option>
              <option value="live">🟢 Live</option>
              <option value="maintenance">🔧 Maintenance</option>
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
    </div>
  )
}
