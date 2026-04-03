// components/finance/LogExpenseForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ExpenseCategory = 'hosting' | 'domains' | 'subscriptions' | 'tools_ai' | 'marketing' | 'other'
type PaidBy = 'shaan' | 'deb' | 'split'

const CATEGORIES: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'hosting', label: 'Hosting' },
  { value: 'domains', label: 'Domains' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'tools_ai', label: 'Tools & AI' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  onClose: () => void
}

export default function LogExpenseForm({ projects, onClose }: Props) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [projectId, setProjectId] = useState<string>('')
  const [paidBy, setPaidBy] = useState<PaidBy>('shaan')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description.trim(),
        amount: Number(amount),
        category,
        project_id: projectId || null,
        paid_by: paidBy,
        expense_date: date,
      }),
    })
    if (!res.ok) { setError('Failed to save. Try again.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Log Expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (e.g. sdvetroute.com domain)"
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
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">🌐 General</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value as PaidBy)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="shaan">Shaan paid</option>
              <option value="deb">Deb paid</option>
              <option value="split">Split 50/50</option>
            </select>
          </div>
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
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
