import { createClient } from '@/lib/supabase/server'
import type { ActivityLogWithDetails } from '@/lib/types/database'

export async function getActivityLog(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      project:projects(id, name, emoji),
      actor:profiles(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ActivityLogWithDetails[]
}

export async function getWins(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      project:projects(id, name, emoji),
      actor:profiles(id, name)
    `)
    .eq('is_win', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ActivityLogWithDetails[]
}
