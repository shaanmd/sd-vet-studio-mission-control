'use client'
import { useState, useEffect } from 'react'

interface Goal {
  amount: number
  deadline: string
  label: string
}

interface Props {
  initialGoal: Goal | null
  currentRevenue: number
}

export default function FinancialGoal({ initialGoal, currentRevenue }: Props) {
  const [goal, setGoal] = useState<Goal | null>(initialGoal)
  const [editing, setEditing] = useState(!initialGoal)
  const [amount, setAmount] = useState(initialGoal?.amount?.toString() ?? '')
  const [deadline, setDeadline] = useState(initialGoal?.deadline ?? '')
  const [label, setLabel] = useState(initialGoal?.label ?? 'Revenue goal')
  const [saving, setSaving] = useState(false)
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (goal?.deadline) {
      const diff = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000)
      setDaysLeft(diff)
    }
  }, [goal])

  async function handleSave() {
    const parsed = parseFloat(amount)
    if (!parsed || !deadline) return
    setSaving(true)
    const newGoal: Goal = { amount: parsed, deadline, label: label || 'Revenue goal' }
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'financial_goal', value: newGoal }),
    })
    setGoal(newGoal)
    setEditing(false)
    setSaving(false)
  }

  const progress = goal ? Math.min(100, Math.round((currentRevenue / goal.amount) * 100)) : 0
  const remaining = goal ? Math.max(0, goal.amount - currentRevenue) : 0
  const isOnTrack = daysLeft !== null && daysLeft > 0

  if (editing) {
    return (
      <div
        className="rounded-2xl p-5 mb-5"
        style={{ background: '#FBF3DE', border: '1.5px solid #EFDDB0' }}
      >
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#B7791F' }}>
          🎯 Set Financial Goal
        </div>
        <div className="flex gap-3 flex-wrap">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Goal label…"
            className="flex-1 min-w-[140px] border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Target $"
            className="w-32 border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <button
            onClick={handleSave}
            disabled={saving || !amount || !deadline}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#1E6B5E' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {goal && (
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-500">
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!goal) return null

  const deadlineDate = new Date(goal.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div
      className="rounded-2xl p-5 mb-5 relative"
      style={{ background: '#FBF3DE', border: '1.5px solid #EFDDB0' }}
    >
      <button
        onClick={() => setEditing(true)}
        className="absolute top-4 right-4 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
        style={{ color: '#B7791F', background: '#EFDDB0' }}
      >
        Edit
      </button>

      <div className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: '#B7791F' }}>
        🎯 {goal.label}
      </div>

      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[28px] font-bold leading-none" style={{ color: '#1E2A35' }}>
          ${currentRevenue.toFixed(0)}
        </span>
        <span className="text-[14px]" style={{ color: '#9AA5AC' }}>
          of ${goal.amount.toLocaleString()}
        </span>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full ml-auto"
          style={{ background: progress >= 100 ? '#D1FAE5' : '#E8F4F0', color: progress >= 100 ? '#065F46' : '#1E6B5E' }}
        >
          {progress}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="rounded-full h-2 mb-3 overflow-hidden" style={{ background: '#EFDDB0' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: progress >= 100 ? '#1E6B5E' : '#D4A853' }}
        />
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span style={{ color: '#B7791F' }}>
          ${remaining.toFixed(0)} to go · deadline {deadlineDate}
        </span>
        {daysLeft !== null && (
          <span
            className="font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: daysLeft <= 7 ? '#FDECEA' : '#E8F4F0',
              color: daysLeft <= 7 ? '#C0392B' : '#1E6B5E',
            }}
          >
            {daysLeft <= 0 ? 'Deadline passed' : `${daysLeft}d left`}
          </span>
        )}
      </div>
    </div>
  )
}
