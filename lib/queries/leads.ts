import { createClient } from '@/lib/supabase/server'
import type { Lead, LeadNote } from '@/lib/types/database'

export async function getLeads(projectId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('leads')
    .select('*, project:projects(name, emoji), added_by_profile:profiles!leads_added_by_fkey(name)')
    .order('created_at', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as (Lead & { project: { name: string; emoji: string }; added_by_profile: { name: string } | null })[]
}

export async function createLead(values: {
  project_id: string
  name: string
  role_clinic?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  source?: string | null
  interest_level?: string
  added_by: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('leads').insert(values).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, values: Partial<Lead>) {
  const supabase = await createClient()
  const { error } = await supabase.from('leads').update(values).eq('id', id)
  if (error) throw error
}

export async function getLeadNotes(leadId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*, author:profiles(name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as (LeadNote & { author: { name: string } | null })[]
}

export async function addLeadNote(leadId: string, content: string, authorId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: leadId, content, author_id: authorId })
  if (error) throw error
}
