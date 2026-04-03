import { createClient } from '@/lib/supabase/server'
import type { ActivityLogEntry } from '@/lib/types/database'

export async function getActivityLog(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, project:projects(name, emoji), actor:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as (ActivityLogEntry & {
    project: { name: string; emoji: string } | null
    actor: { name: string } | null
  })[]
}

export async function getWins(limit = 100) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, project:projects(name, emoji), actor:profiles(name)')
    .eq('is_win', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as (ActivityLogEntry & {
    project: { name: string; emoji: string } | null
    actor: { name: string } | null
  })[]
}
