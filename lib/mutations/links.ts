import { createClient } from '@/lib/supabase/client'

export async function createProjectLink(input: {
  project_id: string
  label: string
  url: string
  icon?: string
}): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('project_links')
    .insert({
      project_id: input.project_id,
      label: input.label,
      url: input.url,
      icon: input.icon ?? null,
      is_auto: false,
    })

  if (error) throw error
}

export async function deleteProjectLink(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('project_links')
    .delete()
    .eq('id', id)

  if (error) throw error
}
