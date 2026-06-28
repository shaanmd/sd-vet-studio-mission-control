// lib/cycles.ts
// Pure date/phase helpers for Cycle Focus — no DB, no I/O, fully testable.
// All dates are 'YYYY-MM-DD' strings interpreted at UTC midnight to avoid
// timezone drift; callers pass an AEST "today" string in.

import type { Cycle, CyclePhase } from '@/lib/types/database'

const MS_PER_DAY = 86_400_000

function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addWeeks(dateStr: string, weeks: number): string {
  const d = parseDate(dateStr)
  d.setUTCDate(d.getUTCDate() + weeks * 7)
  return toDateString(d)
}

export function defaultCycleDates(startsOn: string): { ends_on: string; cooldown_ends_on: string } {
  const ends_on = addWeeks(startsOn, 6)
  return { ends_on, cooldown_ends_on: addWeeks(ends_on, 1) }
}

export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((parseDate(toStr).getTime() - parseDate(fromStr).getTime()) / MS_PER_DAY)
}

export function derivePhase(
  cycle: Pick<Cycle, 'starts_on' | 'ends_on' | 'cooldown_ends_on'>,
  today: string,
): CyclePhase {
  const t = parseDate(today).getTime()
  if (t < parseDate(cycle.starts_on).getTime()) return 'upcoming'
  if (t <= parseDate(cycle.ends_on).getTime()) return 'active'
  if (t <= parseDate(cycle.cooldown_ends_on).getTime()) return 'cooldown'
  return 'done'
}

export function weekOf(cycle: Pick<Cycle, 'starts_on'>, today: string): number {
  const elapsed = daysBetween(cycle.starts_on, today)
  if (elapsed < 0) return 0
  return Math.floor(elapsed / 7) + 1
}

export function totalWeeks(cycle: Pick<Cycle, 'starts_on' | 'ends_on'>): number {
  return Math.round(daysBetween(cycle.starts_on, cycle.ends_on) / 7)
}

export function daysLeft(cycle: Pick<Cycle, 'ends_on'>, today: string): number {
  return Math.max(0, daysBetween(today, cycle.ends_on))
}
