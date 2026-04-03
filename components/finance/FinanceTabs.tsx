// components/finance/FinanceTabs.tsx
'use client'
import { useState } from 'react'
import ExpenseSummaryBar from './ExpenseSummaryBar'
import ExpenseList from './ExpenseList'
import ExpenseCategoryBreakdown from './ExpenseCategoryBreakdown'
import LogExpenseForm from './LogExpenseForm'
import RevenueSummaryBar from './RevenueSummaryBar'
import RevenueList from './RevenueList'
import RevenueStreamBreakdown from './RevenueStreamBreakdown'
import LogRevenueForm from './LogRevenueForm'
import type { Expense, RevenueEntry } from '@/lib/types/database'

const EXPENSE_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'domains', label: 'Domains' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'tools_ai', label: 'Tools & AI' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

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
  defaultTab?: 'expenses' | 'revenue'
}

export default function FinanceTabs({ expenses, revenueEntries, projects, defaultTab = 'expenses' }: Props) {
  const [tab, setTab] = useState<'expenses' | 'revenue'>(defaultTab)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showRevenueForm, setShowRevenueForm] = useState(false)

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex bg-teal-50 rounded-xl p-1 mb-5 gap-1">
        <button
          onClick={() => setTab('expenses')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'expenses' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}
        >
          💸 Expenses
        </button>
        <button
          onClick={() => setTab('revenue')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'revenue' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}
        >
          📈 Revenue
        </button>
      </div>

      {tab === 'expenses' && (
        <>
          <ExpenseSummaryBar expenses={expenses} />
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
            {EXPENSE_CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  categoryFilter === c.value ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <ExpenseCategoryBreakdown expenses={expenses} />
          <ExpenseList expenses={expenses} categoryFilter={categoryFilter} />
          <button
            onClick={() => setShowExpenseForm(true)}
            className="mt-4 w-full bg-teal-700 text-white rounded-xl py-3 font-semibold"
          >
            + Log Expense
          </button>
          {showExpenseForm && <LogExpenseForm projects={projects} onClose={() => setShowExpenseForm(false)} />}
        </>
      )}

      {tab === 'revenue' && (
        <>
          <RevenueSummaryBar entries={revenueEntries} />
          <RevenueStreamBreakdown entries={revenueEntries} />
          <RevenueList entries={revenueEntries} />
          <button
            onClick={() => setShowRevenueForm(true)}
            className="mt-4 w-full bg-amber-500 text-white rounded-xl py-3 font-semibold"
          >
            💰 Log Revenue
          </button>
          {showRevenueForm && <LogRevenueForm projects={projects} onClose={() => setShowRevenueForm(false)} />}
        </>
      )}
    </div>
  )
}
