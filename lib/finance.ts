// lib/finance.ts
import type { Expense, RevenueEntry, ExpenseCategory } from '@/lib/types/database'

export interface ExpenseSummary {
  total: number
  shaanPaid: number
  debPaid: number
  splitTotal: number
  byCategory: Partial<Record<ExpenseCategory, number>>
}

export function getExpenseSummary(expenses: Expense[]): ExpenseSummary {
  const summary: ExpenseSummary = {
    total: 0,
    shaanPaid: 0,
    debPaid: 0,
    splitTotal: 0,
    byCategory: {},
  }

  for (const expense of expenses) {
    summary.total += expense.amount
    if (expense.paid_by === 'shaan') summary.shaanPaid += expense.amount
    if (expense.paid_by === 'deb') summary.debPaid += expense.amount
    if (expense.paid_by === 'split') summary.splitTotal += expense.amount
    summary.byCategory[expense.category] =
      (summary.byCategory[expense.category] ?? 0) + expense.amount
  }

  return summary
}

export function getRevenueTotal(entries: RevenueEntry[]): number {
  return entries.reduce((sum, e) => sum + e.amount, 0)
}

export function getRevenueByStream(entries: RevenueEntry[]): Partial<Record<string, number>> {
  return entries.reduce((acc, e) => {
    acc[e.stream] = (acc[e.stream] ?? 0) + e.amount
    return acc
  }, {} as Record<string, number>)
}

/** Returns entries where date falls within the current calendar week (Mon–Sun) */
export function filterCurrentWeek<T extends { revenue_date?: string; expense_date?: string }>(
  entries: T[],
  dateKey: 'revenue_date' | 'expense_date'
): T[] {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)) // Monday
  startOfWeek.setHours(0, 0, 0, 0)
  return entries.filter((e) => {
    const d = new Date(e[dateKey] as string)
    return d >= startOfWeek && d <= now
  })
}

/** Returns entries where date falls within the current calendar month */
export function filterCurrentMonth<T extends { revenue_date?: string; expense_date?: string }>(
  entries: T[],
  dateKey: 'revenue_date' | 'expense_date'
): T[] {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  return entries.filter(e => {
    const d = new Date(e[dateKey] as string)
    return d.getFullYear() === year && d.getMonth() === month
  })
}
