// lib/queries/cycles.ts
import { createClient } from '@/lib/supabase/server'
import { derivePhase, weekOf, totalWeeks, daysLeft } from '@/lib/cycles'
import type {
  Cycle, CycleWithPhase, BetWithDetails, BetCheckin, Project,
} from '@/lib/types/database'

/** Today in AEST as 'YYYY-MM-DD' — matches the 7am AEST digest. */
export function aestToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
}

/** The cycle whose [starts_on, cooldown_ends_on] contains today; else the latest. */
export async function getCurrentCycle(): Promise<CycleWithPhase | null> {
  const supabase = await createClient()
  const today = aestToday()

  const { data: current } = await supabase
    .from('cycles')
    .select('*')
    .lte('starts_on', today)
    .gte('cooldown_ends_on', today)
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle()

  let cycle = current as Cycle | null
  if (!cycle) {
    const { data: latest } = await supabase
      .from('cycles')
      .select('*')
      .order('starts_on', { ascending: false })
      .limit(1)
      .maybeSingle()
    cycle = latest as Cycle | null
  }
  if (!cycle) return null

  return {
    ...cycle,
    phase: derivePhase(cycle, today),
    weekOf: weekOf(cycle, today),
    totalWeeks: totalWeeks(cycle),
    daysLeft: daysLeft(cycle, today),
  }
}

/** Bets for a cycle, joined to their project + most-recent check-in. */
export async function getCycleBets(cycleId: string): Promise<BetWithDetails[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cycle_bets')
    .select('*, project:projects(id, name, emoji, stage)')
    .eq('cycle_id', cycleId)
    .order('sort_order', { ascending: true })

  const bets = (data ?? []) as unknown as BetWithDetails[]
  const betIds = bets.map((b) => b.id)
  if (betIds.length === 0) return bets

  const { data: checkins } = await supabase
    .from('bet_checkins')
    .select('*')
    .in('bet_id', betIds)
    .order('checkin_date', { ascending: false })

  const latestByBet: Record<string, BetCheckin> = {}
  for (const c of (checkins ?? []) as BetCheckin[]) {
    if (!latestByBet[c.bet_id]) latestByBet[c.bet_id] = c
  }
  return bets.map((b) => ({ ...b, latest_checkin: latestByBet[b.id] ?? null }))
}

/** Active-stage projects NOT bet on this cycle — the Parking Lot. */
export async function getParkingLotProjects(
  cycleId: string,
): Promise<Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>[]> {
  const supabase = await createClient()
  const { data: bets } = await supabase
    .from('cycle_bets')
    .select('project_id')
    .eq('cycle_id', cycleId)
  const betIds = new Set((bets ?? []).map((b: { project_id: string }) => b.project_id))

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, emoji, stage')
    .in('stage', ['live', 'beta', 'building'])
    .order('updated_at', { ascending: false })

  return ((projects ?? []) as Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>[])
    .filter((p) => !betIds.has(p.id))
}
