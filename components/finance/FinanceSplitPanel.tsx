'use client'
import { useState, useMemo } from 'react'
import LogExpenseForm from './LogExpenseForm'
import LogRevenueForm from './LogRevenueForm'
import type { Expense, RevenueEntry } from '@/lib/types/database'

const EXPENSE_CATS = [
  { value: 'all', label: 'All' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'domains', label: 'Domains' },
  { value: 'tools_ai', label: 'Tools & AI' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'marketing', label: 'Marketing' },
]

const PAID_BY_INITIALS: Record<string, { letter: string; bg: string; color: string }> = {
  shaan: { letter: 'S', bg: '#E8F4F0', color: '#1E6B5E' },
  deb:   { letter: 'D', bg: '#EDE9FE', color: '#5B21B6' },
  split: { letter: '½', bg: '#F3F4F6', color: '#6B7280' },
}

type TimeFilter = 'month' | 'ytd' | 'all'

interface ExpenseWithProject extends Expense {
  project: { name: string; emoji: string } | null
}
interface RevenueWithProject extends RevenueEntry {
  project: { name: string; emoji: string } | null
}

interface Props {
  expenses: ExpenseWithProject[]
  revenueEntries: RevenueWithProject[]
  projects: Array<{ id: string; name: string; emoji: string }>
}

function applyTimeFilter<T extends { expense_date?: string; revenue_date?: string }>(
  items: T[],
  dateKey: 'expense_date' | 'revenue_date',
  filter: TimeFilter
): T[] {
  if (filter === 'all') return items
  const now = new Date()
  return items.filter(item => {
    const d = new Date((item as any)[dateKey])
    if (filter === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    if (filter === 'ytd') return d.getFullYear() === now.getFullYear()
    return true
  })
}

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All time' },
]

export default function FinanceSplitPanel({ expenses, revenueEntries, projects }: Props) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month')
  const [catFilter, setCatFilter] = useState('all')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showRevenueForm, setShowRevenueForm] = useState(false)

  const timeFilteredExpenses = useMemo(() => applyTimeFilter(expenses, 'expense_date', timeFilter), [expenses, timeFilter])
  const timeFilteredRevenue = useMemo(() => applyTimeFilter(revenueEntries, 'revenue_date', timeFilter), [revenueEntries, timeFilter])

  const filteredExpenses = catFilter === 'all' ? timeFilteredExpenses : timeFilteredExpenses.filter(e => e.category === catFilter)

  const expenseTotal = timeFilteredExpenses.reduce((s, e) => s + e.amount, 0)
  const revenueTotal = timeFilteredRevenue.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      {/* Shared time filter */}
      <div className="flex items-center gap-1.5 mb-4">
        {TIME_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setTimeFilter(f.value)}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors"
            style={
              timeFilter === f.value
                ? { background: '#1E2A35', color: '#fff' }
                : { background: '#fff', color: '#6B7A82', border: '1px solid #E8E2D6' }
            }
          >
            {f.label}
          </button>
        ))}
        <span className="text-[12px] ml-2" style={{ color: '#9AA5AC' }}>
          Revenue <strong style={{ color: '#1E6B5E' }}>${revenueTotal.toFixed(0)}</strong>
          {' · '}
          Expenses <strong style={{ color: '#C0392B' }}>${expenseTotal.toFixed(0)}</strong>
          {' · '}
          P&L <strong style={{ color: revenueTotal - expenseTotal >= 0 ? '#1E6B5E' : '#C0392B' }}>
            {revenueTotal - expenseTotal >= 0 ? '+' : ''}${(revenueTotal - expenseTotal).toFixed(0)}
          </strong>
        </span>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        {/* Expenses panel */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #E8E2D6' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>💸</span>
                <span className="font-bold text-[14px]" style={{ color: '#1E2A35' }}>Expenses</span>
              </div>
              <span className="text-[13px] font-bold" style={{ color: '#C0392B' }}>${expenseTotal.toFixed(0)}</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {EXPENSE_CATS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCatFilter(c.value)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                  style={
                    catFilter === c.value
                      ? { background: '#1E2A35', color: '#fff' }
                      : { background: '#F5F0E8', color: '#6B7A82', border: '1px solid #E8E2D6' }
                  }
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: '#F5F0E8' }}>
            {filteredExpenses.length === 0 && (
              <p className="px-5 py-6 text-sm text-center" style={{ color: '#9AA5AC' }}>No expenses.</p>
            )}
            {filteredExpenses.map(e => {
              const paidBy = PAID_BY_INITIALS[e.paid_by] ?? PAID_BY_INITIALS.split
              const dateStr = new Date(e.expense_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              const catLabel = e.category.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
              return (
                <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg shrink-0" style={{ background: '#F5F0E8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: '#1E2A35' }}>{e.description}</div>
                    <div className="text-[11px]" style={{ color: '#9AA5AC' }}>{catLabel} · {dateStr}</div>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: paidBy.bg, color: paidBy.color }}
                  >
                    {paidBy.letter}
                  </div>
                  <span className="text-[13px] font-bold shrink-0" style={{ color: '#C0392B' }}>
                    ${e.amount.toFixed(0)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue panel */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E8E2D6' }}>
            <div className="flex items-center gap-2">
              <span>💰</span>
              <span className="font-bold text-[14px]" style={{ color: '#1E2A35' }}>Revenue</span>
            </div>
            <span className="text-[13px] font-bold" style={{ color: '#1E6B5E' }}>${revenueTotal.toFixed(0)}</span>
          </div>

          <div className="divide-y" style={{ borderColor: '#F5F0E8' }}>
            {timeFilteredRevenue.length === 0 && (
              <p className="px-5 py-6 text-sm text-center" style={{ color: '#9AA5AC' }}>No revenue logged yet.</p>
            )}
            {timeFilteredRevenue.map(e => {
              const dateStr = new Date(e.revenue_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
              const paidBy = (e as any).received_by ? (PAID_BY_INITIALS[(e as any).received_by] ?? null) : null
              return (
                <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-base" style={{ background: '#FBF3DE' }}>
                    💰
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: '#1E2A35' }}>{e.description}</div>
                    <div className="text-[11px]" style={{ color: '#9AA5AC' }}>
                      {dateStr}{(e as any).project && ` · ${(e as any).project.name}`}
                    </div>
                  </div>
                  {paidBy && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ background: paidBy.bg, color: paidBy.color }}
                    >
                      {paidBy.letter}
                    </div>
                  )}
                  <span className="text-[13px] font-bold shrink-0" style={{ color: '#1E6B5E' }}>
                    ${e.amount.toFixed(0)}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="px-5 py-3" style={{ borderTop: '1px solid #F5F0E8' }}>
            <button
              onClick={() => setShowRevenueForm(true)}
              className="w-full text-[13px] font-semibold py-2 rounded-xl transition-colors"
              style={{ background: '#F5F0E8', color: '#1E6B5E', border: '1.5px dashed #EFDDB0' }}
            >
              + Log revenue · cha-ching 💰
            </button>
          </div>
        </div>
      </div>

      {showExpenseForm && <LogExpenseForm projects={projects} onClose={() => setShowExpenseForm(false)} />}
      {showRevenueForm && <LogRevenueForm projects={projects} onClose={() => setShowRevenueForm(false)} />}
    </div>
  )
}
