import type { Expense } from '@/lib/types/database'

const PAID_BY_STYLE: Record<string, string> = {
  shaan: 'bg-teal-50 text-teal-700',
  deb: 'bg-purple-50 text-purple-700',
  split: 'bg-gray-100 text-gray-600',
}
const PAID_BY_LABEL: Record<string, string> = {
  shaan: 'Shaan paid',
  deb: 'Deb paid',
  split: 'Split 50/50',
}

interface ExpenseWithProject extends Expense {
  project: { name: string; emoji: string } | null
}

interface Props {
  expenses: ExpenseWithProject[]
  categoryFilter: string
}

export default function ExpenseList({ expenses, categoryFilter }: Props) {
  const filtered = categoryFilter === 'all' ? expenses : expenses.filter(e => e.category === categoryFilter)

  if (filtered.length === 0) {
    return <p className="text-center text-gray-400 py-6 text-sm">No expenses yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {filtered.map(expense => (
        <div key={expense.id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 text-sm">{expense.description}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              {expense.project
                ? <span>{expense.project.emoji} {expense.project.name}</span>
                : <span>🌐 General</span>
              }
              <span>·</span>
              <span className="capitalize">{expense.category.replace('_', ' ')}</span>
              <span>·</span>
              <span>{new Date(expense.expense_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-bold text-red-500 text-sm">
              −${expense.amount.toFixed(2)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAID_BY_STYLE[expense.paid_by]}`}>
              {PAID_BY_LABEL[expense.paid_by]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
