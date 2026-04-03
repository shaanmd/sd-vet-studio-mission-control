import { createClient } from '@/lib/supabase/server'
import type { ContentItem } from '@/lib/types/database'

export async function getContentItems(projectId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('content_items')
    .select('*, project:projects(name, emoji)')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as (ContentItem & { project: { name: string; emoji: string } | null })[]
}

export async function createContentItem(values: {
  description: string
  platform: string
  project_id?: string | null
  scheduled_date?: string | null
  created_by: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('content_items').insert({ status: 'draft', ...values })
  if (error) throw error
}

export async function updateContentItemStatus(id: string, status: 'draft' | 'scheduled' | 'published') {
  const supabase = await createClient()
  const { error } = await supabase.from('content_items').update({ status }).eq('id', id)
  if (error) throw error
}
