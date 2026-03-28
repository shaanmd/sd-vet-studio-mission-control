import { createClient } from '@/lib/supabase/client'
import type { InterestLevel } from '@/lib/types/database'

export async function addLead(data: {
  project_id: string
  name: string
  role_clinic?: string
  contact_email?: string
  source?: string
  interest_level?: InterestLevel
  added_by: string
}): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('leads')
    .insert({
      project_id: data.project_id,
      name: data.name,
      role_clinic: data.role_clinic ?? null,
      contact_email: data.contact_email ?? null,
      source: data.source ?? null,
      interest_level: data.interest_level ?? 'warm',
      added_by: data.added_by,
    })

  if (error) { console.error("[supabase mutation error]", error); throw error; }
}

export async function promoteToBeta(leadId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('leads')
    .update({
      is_beta_tester: true,
      beta_invited_at: new Date().toISOString(),
      beta_accepted: 'pending',
    })
    .eq('id', leadId)

  if (error) { console.error("[supabase mutation error]", error); throw error; }
}
