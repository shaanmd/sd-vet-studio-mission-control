// lib/__tests__/finance.test.ts
import { describe, it, expect } from 'vitest'
import { getExpenseSummary, getRevenueTotal } from '../finance'
import type { Expense, RevenueEntry } from '../types'

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 'e1',
  description: 'Test expense',
  amount: 10,
  category: 'hosting',
  project_id: null,
  paid_by: 'shaan',
  expense_date: '2026-04-01',
  created_by: null,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

const makeRevenue = (overrides: Partial<RevenueEntry> = {}): RevenueEntry => ({
  id: 'r1',
  description: 'Test revenue',
  amount: 100,
  stream: 'course',
  project_id: null,
  revenue_date: '2026-04-01',
  created_by: null,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

describe('getExpenseSummary', () => {
  it('returns correct totals per paid_by', () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 25, paid_by: 'shaan' }),
      makeExpense({ amount: 10, paid_by: 'shaan' }),
      makeExpense({ amount: 50, paid_by: 'deb' }),
      makeExpense({ amount: 20, paid_by: 'split' }),
    ]
    const summary = getExpenseSummary(expenses)
    expect(summary.shaanPaid).toBe(35)
    expect(summary.debPaid).toBe(50)
    expect(summary.splitTotal).toBe(20)
    expect(summary.total).toBe(105)
  })

  it('returns zeros for empty array', () => {
    const summary = getExpenseSummary([])
    expect(summary.shaanPaid).toBe(0)
    expect(summary.debPaid).toBe(0)
    expect(summary.total).toBe(0)
  })

  it('groups expenses by category', () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 10, category: 'hosting' }),
      makeExpense({ amount: 20, category: 'hosting' }),
      makeExpense({ amount: 15, category: 'domains' }),
    ]
    const summary = getExpenseSummary(expenses)
    expect(summary.byCategory.hosting).toBe(30)
    expect(summary.byCategory.domains).toBe(15)
  })
})

describe('getRevenueTotal', () => {
  it('sums revenue entries', () => {
    const entries: RevenueEntry[] = [
      makeRevenue({ amount: 500 }),
      makeRevenue({ amount: 250 }),
    ]
    expect(getRevenueTotal(entries)).toBe(750)
  })

  it('returns 0 for empty array', () => {
    expect(getRevenueTotal([])).toBe(0)
  })

  it('groups by stream', () => {
    const entries: RevenueEntry[] = [
      makeRevenue({ amount: 200, stream: 'course' }),
      makeRevenue({ amount: 100, stream: 'course' }),
      makeRevenue({ amount: 50, stream: 'subscription' }),
    ]
    const byStream = entries.reduce((acc, e) => {
      acc[e.stream] = (acc[e.stream] ?? 0) + e.amount
      return acc
    }, {} as Record<string, number>)
    expect(byStream.course).toBe(300)
    expect(byStream.subscription).toBe(50)
  })
})
