// lib/revenue.ts
import type { EnergyLevel, RevenueScore, MoneyMove } from './types'

const REVENUE_RANK: Record<RevenueScore, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

const ENERGY_RANK: Record<EnergyLevel, number> = {
  low: 3,    // low-energy tasks surface first — easier to start
  medium: 2,
  high: 1,
}

/**
 * Sorts MoneyMove items for the Home screen list.
 * Order: pinned projects → revenue score (desc) → is_next_step → energy level (low first)
 */
export function sortMoneyMoves(moves: MoneyMove[]): MoneyMove[] {
  return [...moves].sort((a, b) => {
    // 1. Pinned projects first
    if (a.project.pinned !== b.project.pinned) {
      return a.project.pinned ? -1 : 1
    }
    // 2. Revenue score descending
    const scoreDiff = REVENUE_RANK[b.project.revenue_score] - REVENUE_RANK[a.project.revenue_score]
    if (scoreDiff !== 0) return scoreDiff
    // 3. Next step tasks before regular tasks
    if (a.task.is_next_step !== b.task.is_next_step) {
      return a.task.is_next_step ? -1 : 1
    }
    // 4. Low-energy tasks first (easiest to start)
    return ENERGY_RANK[b.task.energy] - ENERGY_RANK[a.task.energy]
  })
}
