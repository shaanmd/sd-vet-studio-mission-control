'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RevenueStream = 'course' | 'subscription' | 'inapp' | 'consulting' | 'sponsorship' | 'affiliate' | 'other'

const STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course', label: '🎓 Course sales' },
  { value: 'subscription', label: '🔄 Subscription' },
  { value: 'inapp', label: '📱 In-app / tokens' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'sponsorship', label: '🤝 Sponsorship' },
  { value: 'affiliate', label: '🔗 Affiliate' },
  { value: 'other', label: '📦 Other' },
]

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  onClose: () => void
}

export default function LogRevenueForm({ projects, onClose }: Props) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [stream, setStream] = useState<RevenueStream>('other')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/finance/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description.trim(),
        amount: Number(amount),
        stream,
        project_id: projectId || null,
        revenue_date: date,
      }),
    })
    if (!res.ok) { setError('Failed to save. Try again.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">💰 Log Revenue</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. VetScribe Pro — 3 new subscriptions"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount ($)"
              type="number"
              step="0.01"
              min="0"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={stream}
              onChange={e => setStream(e.target.value as RevenueStream)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {STREAMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">No specific project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Log Revenue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
