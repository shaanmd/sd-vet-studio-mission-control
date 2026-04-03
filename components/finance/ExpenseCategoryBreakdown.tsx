'use client'
import { useState } from 'react'
import type { Expense } from '@/lib/types/database'
import { getExpenseSummary } from '@/lib/finance'

const CATEGORY_LABELS: Record<string, string> = {
  hosting: 'Hosting',
  domains: 'Domains',
  subscriptions: 'Subscriptions',
  tools_ai: 'Tools & AI',
  marketing: 'Marketing',
  other: 'Other',
}

interface Props { expenses: Expense[] }

export default function ExpenseCategoryBreakdown({ expenses }: Props) {
  const [open, setOpen] = useState(false)
  const summary = getExpenseSummary(expenses)
  const categories = Object.entries(summary.byCategory).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))

  return (
    <div className="bg-[#f9f5ef] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>Category breakdown</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {categories.map(([cat, total]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span className="text-gray-600">{CATEGORY_LABELS[cat] ?? cat}</span>
              <span className="font-semibold text-gray-800">${(total ?? 0).toFixed(2)}</span>
            </div>
          ))}
          {categories.length === 0 && <p className="text-gray-400 text-sm">No expenses logged.</p>}
        </div>
      )}
    </div>
  )
}
