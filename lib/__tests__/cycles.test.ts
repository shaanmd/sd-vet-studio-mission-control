import { describe, it, expect } from 'vitest'
import {
  addWeeks,
  defaultCycleDates,
  derivePhase,
  daysBetween,
  weekOf,
  totalWeeks,
  daysLeft,
} from '../cycles'

const cycle = { starts_on: '2026-07-06', ends_on: '2026-08-17', cooldown_ends_on: '2026-08-24' }

describe('addWeeks', () => {
  it('adds whole weeks without timezone drift', () => {
    expect(addWeeks('2026-07-06', 6)).toBe('2026-08-17')
    expect(addWeeks('2026-08-17', 1)).toBe('2026-08-24')
  })
})

describe('defaultCycleDates', () => {
  it('computes ends_on = +6w and cooldown_ends_on = +7w', () => {
    expect(defaultCycleDates('2026-07-06')).toEqual({
      ends_on: '2026-08-17',
      cooldown_ends_on: '2026-08-24',
    })
  })
})

describe('derivePhase', () => {
  it('is upcoming the day before start', () => {
    expect(derivePhase(cycle, '2026-07-05')).toBe('upcoming')
  })
  it('is active on the start day and the last active day', () => {
    expect(derivePhase(cycle, '2026-07-06')).toBe('active')
    expect(derivePhase(cycle, '2026-08-17')).toBe('active')
  })
  it('is cooldown after ends_on through cooldown_ends_on', () => {
    expect(derivePhase(cycle, '2026-08-18')).toBe('cooldown')
    expect(derivePhase(cycle, '2026-08-24')).toBe('cooldown')
  })
  it('is done after cooldown_ends_on', () => {
    expect(derivePhase(cycle, '2026-08-25')).toBe('done')
  })
})

describe('daysBetween / weekOf / totalWeeks / daysLeft', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-07-06', '2026-07-13')).toBe(7)
  })
  it('weekOf is 1 on the start day, 2 after 7 days', () => {
    expect(weekOf(cycle, '2026-07-06')).toBe(1)
    expect(weekOf(cycle, '2026-07-12')).toBe(1)
    expect(weekOf(cycle, '2026-07-13')).toBe(2)
  })
  it('totalWeeks is 6 for a default cycle', () => {
    expect(totalWeeks(cycle)).toBe(6)
  })
  it('daysLeft is days until ends_on, floored at 0', () => {
    expect(daysLeft(cycle, '2026-08-15')).toBe(2)
    expect(daysLeft(cycle, '2026-08-20')).toBe(0)
  })
})
