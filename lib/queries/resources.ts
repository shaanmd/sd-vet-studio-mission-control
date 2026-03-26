import { createClient } from '@/lib/supabase/server'
import type { Resource, ResourceCategory } from '@/lib/types/database'

export async function getResources() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error

  // Group by category
  const grouped: Record<ResourceCategory, Resource[]> = {
    dev: [], marketing: [], ai: [], business: [], brand: [], contacts: [],
  }
  for (const r of (data ?? []) as Resource[]) {
    grouped[r.category]?.push(r)
  }
  return grouped
}
