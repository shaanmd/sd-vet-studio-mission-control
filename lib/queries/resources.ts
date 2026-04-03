import { createClient } from '@/lib/supabase/server'
import type { Resource } from '@/lib/types/database'

export async function getResources() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('category')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as Resource[]
}

export async function createResource(values: {
  category: string
  name: string
  description?: string
  url?: string
  icon?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('resources').insert({ icon: '🔗', sort_order: 99, ...values })
  if (error) throw error
}
