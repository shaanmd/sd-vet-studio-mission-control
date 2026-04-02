// lib/__tests__/revenue.test.ts
import { describe, it, expect } from 'vitest'
import { sortMoneyMoves } from '../revenue'
import type { Project, Task, MoneyMove } from '../types'

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Test Project',
  emoji: '📁',
  summary: null,
  stage: 'building',
  revenue_score: 'medium',
  revenue_stream: null,
  revenue_per_conversion: null,
  pinned: false,
  github_repo: null,
  vercel_project_id: null,
  live_url: null,
  created_by: null,
  updated_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  project_id: 'p1',
  title: 'Test task',
  assigned_to: null,
  is_shared: false,
  is_next_step: false,
  energy: 'medium',
  completed: false,
  completed_at: null,
  completed_by: null,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const move = (taskOverrides: Partial<Task>, projectOverrides: Partial<Project>): MoneyMove => ({
  task: makeTask(taskOverrides),
  project: makeProject(projectOverrides),
})

describe('sortMoneyMoves', () => {
  it('puts pinned project tasks before unpinned, regardless of revenue score', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1' }, { id: 'p1', pinned: false, revenue_score: 'high' }),
      move({ id: 't2' }, { id: 'p2', pinned: true, revenue_score: 'low' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted[0].task.id).toBe('t2')
  })

  it('sorts by revenue score descending when pin status matches', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1' }, { revenue_score: 'low' }),
      move({ id: 't2' }, { revenue_score: 'high' }),
      move({ id: 't3' }, { revenue_score: 'medium' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted.map(m => m.task.id)).toEqual(['t2', 't3', 't1'])
  })

  it('puts is_next_step tasks before regular tasks at same revenue score', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1', is_next_step: false }, { revenue_score: 'high' }),
      move({ id: 't2', is_next_step: true }, { revenue_score: 'high' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted[0].task.id).toBe('t2')
  })

  it('surfaces low energy tasks first when score and next_step match', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1', energy: 'high', is_next_step: false }, { revenue_score: 'medium' }),
      move({ id: 't2', energy: 'low', is_next_step: false }, { revenue_score: 'medium' }),
      move({ id: 't3', energy: 'medium', is_next_step: false }, { revenue_score: 'medium' }),
    ]
    const sorted = sortMoneyMoves(moves)
    expect(sorted.map(m => m.task.id)).toEqual(['t2', 't3', 't1'])
  })

  it('returns empty array unchanged', () => {
    expect(sortMoneyMoves([])).toEqual([])
  })

  it('does not mutate the input array', () => {
    const moves: MoneyMove[] = [
      move({ id: 't1' }, { revenue_score: 'low' }),
      move({ id: 't2' }, { revenue_score: 'high' }),
    ]
    const original = [...moves]
    sortMoneyMoves(moves)
    expect(moves[0].task.id).toBe(original[0].task.id)
  })
})
