'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

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
  const [label, setLabel] = useState(initialGoal?.label ?? 'Q2 Revenue Goal')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const parsed = parseFloat(amount)
    if (!parsed || !deadline) return
    setSaving(true)
    const newGoal: Goal = { amount: parsed, deadline, label: label || 'Q2 Revenue Goal' }
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'financial_goal', value: newGoal }),
    })
    setGoal(newGoal)
    setEditing(false)
    setSaving(false)
  }

  if (editing) {
    return (
      <div className="rounded-2xl p-5 mb-5" style={{ background: '#FBF3DE', border: '1.5px solid #EFDDB0' }}>
        <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#B7791F' }}>
          Set Revenue Goal
        </div>
        <div className="flex gap-3 flex-wrap">
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Q2 Revenue Goal)"
            className="flex-1 min-w-[160px] border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Target $"
            className="w-32 border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <button onClick={handleSave} disabled={saving || !amount || !deadline}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#1E6B5E' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {goal && <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm" style={{ color: '#9AA5AC' }}>Cancel</button>}
        </div>
      </div>
    )
  }

  if (!goal) return null

  const now = Date.now()
  const deadlineTs = new Date(goal.deadline).setHours(23, 59, 59, 999)
  const daysLeft = Math.max(0, Math.ceil((deadlineTs - now) / 86400000))

  // Figure out start of goal period — approximate as 90 days before deadline
  const totalDays = 90
  const daysElapsed = Math.max(0, totalDays - daysLeft)
  const expectedPct = Math.min(100, Math.round((daysElapsed / totalDays) * 100))
  const actualPct = Math.min(100, Math.round((currentRevenue / goal.amount) * 100))
  const remaining = Math.max(0, goal.amount - currentRevenue)
  const dailyNeeded = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : 0
  const expectedAmount = Math.round((daysElapsed / totalDays) * goal.amount)
  const behindBy = Math.max(0, expectedAmount - currentRevenue)
  const isAhead = currentRevenue >= expectedAmount

  const deadlineLabel = new Date(goal.deadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })

  const fmt = (n: number) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)

  return (
    <div
      className="rounded-2xl p-5 mb-5 relative"
      style={{ background: '#FBF3DE', border: '1.5px solid #EFDDB0' }}
    >
      {/* Edit button */}
      <button
        onClick={() => setEditing(true)}
        className="absolute top-4 right-4 text-[11px] font-semibold px-2 py-1 rounded-lg"
        style={{ color: '#B7791F', background: '#EFDDB0' }}
      >
        Edit
      </button>

      {/* Top row: goal title + days left box */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="text-[10.5px] uppercase tracking-[2px] font-bold mb-1" style={{ color: '#B7791F' }}>
            {goal.label}
          </div>
          <div className="text-[26px] font-bold leading-tight" style={{ color: '#1E2A35', fontFamily: 'Georgia, serif' }}>
            {fmt(goal.amount)} by {deadlineLabel}
          </div>
        </div>
        <div
          className="shrink-0 rounded-xl px-4 py-3 text-center"
          style={{ background: '#fff', border: '1px solid #EFDDB0', minWidth: 88 }}
        >
          <div className="text-[9.5px] uppercase tracking-[1.5px] font-bold mb-0.5" style={{ color: '#9AA5AC' }}>Time left</div>
          <div className="text-[28px] font-bold leading-none" style={{ color: '#D4A853' }}>{daysLeft}</div>
          <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#9AA5AC' }}>days</div>
        </div>
      </div>

      {/* Banked + still need */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span className="text-[32px] font-bold leading-none" style={{ color: '#1E2A35' }}>
            {fmt(currentRevenue)}
          </span>
          <span className="text-[14px] ml-2" style={{ color: '#9AA5AC' }}>banked</span>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: '#9AA5AC' }}>still need</div>
          <div className="text-[18px] font-bold" style={{ color: '#C0392B' }}>{fmt(remaining)}</div>
        </div>
      </div>

      {/* Progress bar with "should be" marker */}
      <div className="relative h-2.5 rounded-full mb-1.5 overflow-visible" style={{ background: '#EFDDB0' }}>
        {/* Actual progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${actualPct}%`, background: '#1E6B5E' }}
        />
        {/* "Should be" marker line */}
        {expectedPct > 0 && expectedPct < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full"
            style={{ left: `${expectedPct}%`, background: '#C0392B' }}
          />
        )}
      </div>

      {/* Bar labels */}
      <div className="flex items-center justify-between text-[11px] mb-3">
        <span className="font-semibold" style={{ color: '#6B7A82' }}>{actualPct}% banked</span>
        {!isAhead && (
          <span className="font-semibold" style={{ color: '#D4A853' }}>
            ↑ should be at {expectedPct}% by today
          </span>
        )}
        {isAhead && (
          <span className="font-semibold" style={{ color: '#1E6B5E' }}>✓ ahead of pace</span>
        )}
        <span style={{ color: '#9AA5AC' }}>{fmt(goal.amount)} goal</span>
      </div>

      {/* Bottom: catch-up message + CTA */}
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: '#fff8e8', border: '1px solid #EFDDB0' }}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="text-[16px] shrink-0 mt-0.5">{isAhead ? '🚀' : '🔥'}</span>
          <div>
            <div className="text-[13px] font-bold" style={{ color: '#1E2A35' }}>
              {isAhead
                ? `${fmt(currentRevenue - expectedAmount)} ahead of pace`
                : `Bank ${fmt(dailyNeeded)}/day to catch up`}
            </div>
            <div className="text-[11.5px]" style={{ color: '#9AA5AC' }}>
              {isAhead
                ? `${daysLeft} days left · ${fmt(remaining)} still to go`
                : `You're ${fmt(behindBy)} behind pace · ${daysLeft} days left`}
            </div>
          </div>
        </div>
        <Link
          href="/finance"
          className="shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-bold text-white whitespace-nowrap"
          style={{ background: '#D4A853' }}
        >
          + Log revenue
        </Link>
      </div>
    </div>
  )
}
