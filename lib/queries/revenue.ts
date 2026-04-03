// lib/queries/revenue.ts
import { createClient } from '@/lib/supabase/server'
import type { RevenueEntry, Expense } from '@/lib/types/database'

export async function getRevenueEntries(projectId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('revenue_entries')
    .select('*')
    .order('revenue_date', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as RevenueEntry[]
}

export async function getExpenses(projectId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('expenses')
    .select('*, project:projects(name, emoji)')
    .order('expense_date', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as (Expense & { project: { name: string; emoji: string } | null })[]
}
