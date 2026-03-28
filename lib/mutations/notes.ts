import { createClient } from '@/lib/supabase/client'

export async function addProjectNote(input: {
  project_id: string
  author_id: string
  content: string
}): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('project_notes')
    .insert({
      project_id: input.project_id,
      author_id: input.author_id,
      content: input.content,
      note_type: 'note',
    })

  if (error) { console.error("[supabase mutation error]", error); throw error; }
}
