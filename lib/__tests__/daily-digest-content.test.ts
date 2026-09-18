// The digest should show the same fire tasks as the home page (active-stage or
// pinned projects, pinned first, then most recently updated), sliced to the
// recipient — and revenue totals computed on the Sydney calendar, not UTC.
import { describe, it, expect } from 'vitest'
import { pickDigestTasks, revenueSnapshot, type DigestTaskSource } from '@/lib/email/daily-digest'

function task(
  title: string,
  assigned_to: string | null,
  project: Partial<NonNullable<DigestTaskSource['project']>> | null,
): DigestTaskSource {
  return {
    title,
    energy: 'medium',
    due_date: null,
    assigned_to,
    project: project
      ? { id: 'p', name: 'Proj', emoji: null, stage: 'building', pinned: false, updated_at: '2026-01-01T00:00:00Z', ...project }
      : null,
  }
}

describe('pickDigestTasks', () => {
  it('drops tasks from non-active, unpinned projects and tasks with no project', () => {
    const rows = [
      task('idea task', null, { stage: 'someday' }),
      task('orphan', null, null),
      task('pinned idea', null, { stage: 'someday', pinned: true }),
      task('live task', null, { stage: 'live' }),
    ]
    expect(pickDigestTasks(rows, 'shaan').map((t) => t.title)).toEqual(['pinned idea', 'live task'])
  })

  it('orders pinned projects first, then most recently updated', () => {
    const rows = [
      task('old', null, { updated_at: '2026-01-01T00:00:00Z' }),
      task('new', null, { updated_at: '2026-06-01T00:00:00Z' }),
      task('pinned-old', null, { pinned: true, updated_at: '2025-01-01T00:00:00Z' }),
    ]
    expect(pickDigestTasks(rows, 'shaan').map((t) => t.title)).toEqual(['pinned-old', 'new', 'old'])
  })

  it("keeps the recipient's, 'both' and unassigned tasks, and hides the other person's", () => {
    const rows = [
      task('mine', 'shaan', {}),
      task('ours', 'both', {}),
      task('anyone', null, {}),
      task('debs', 'deb', {}),
    ]
    expect(pickDigestTasks(rows, 'shaan').map((t) => t.title).sort()).toEqual(['anyone', 'mine', 'ours'])
  })

  it('caps at 5 by default', () => {
    const rows = Array.from({ length: 8 }, (_, i) => task(`t${i}`, null, {}))
    expect(pickDigestTasks(rows, 'deb')).toHaveLength(5)
  })

  it('labels the project with its emoji', () => {
    const [t] = pickDigestTasks([task('x', null, { name: 'SynAIpseVet', emoji: '🧠' })], 'shaan')
    expect(t.project).toBe('🧠 SynAIpseVet')
  })
})

describe('revenueSnapshot', () => {
  // 2026-09-17 is a Thursday → week starts Monday 2026-09-14
  const today = '2026-09-17'
  const entries = [
    { amount: 100, revenue_date: '2026-09-16' }, // yesterday, this week, this month
    { amount: 50,  revenue_date: '2026-09-14' }, // Monday: this week, this month
    { amount: 25,  revenue_date: '2026-09-13' }, // last Sunday: this month only
    { amount: 10,  revenue_date: '2026-08-31' }, // last month
    { amount: 7,   revenue_date: '2026-09-17' }, // today counts toward week + month
  ]

  it('splits into yesterday / this week (Mon–today) / this month', () => {
    expect(revenueSnapshot(entries, today)).toEqual({ yesterday: 100, week: 157, month: 182 })
  })

  it('handles a Monday (week = just today) and month rollover for yesterday', () => {
    const monday = '2026-06-01'
    const rows = [
      { amount: 40, revenue_date: '2026-05-31' },
      { amount: 5,  revenue_date: '2026-06-01' },
    ]
    expect(revenueSnapshot(rows, monday)).toEqual({ yesterday: 40, week: 5, month: 5 })
  })

  it('treats null amounts as zero', () => {
    expect(revenueSnapshot([{ amount: null, revenue_date: today }], today)).toEqual({ yesterday: 0, week: 0, month: 0 })
  })
})
