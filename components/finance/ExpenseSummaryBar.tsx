import type { Expense } from '@/lib/types/database'
import { getExpenseSummary, filterCurrentMonth } from '@/lib/finance'

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

interface Props { expenses: Expense[] }

export default function ExpenseSummaryBar({ expenses }: Props) {
  const monthExpenses = filterCurrentMonth(expenses, 'expense_date')
  const summary = getExpenseSummary(monthExpenses)
  const allTime = getExpenseSummary(expenses)

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-sm font-semibold">
        {fmt(summary.total)} this month
      </div>
      <div className="bg-teal-50 text-teal-700 rounded-full px-3 py-1.5 text-sm">
        Shaan paid: {fmt(allTime.shaanPaid)}
      </div>
      <div className="bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 text-sm">
        Deb paid: {fmt(allTime.debPaid)}
      </div>
    </div>
  )
}
