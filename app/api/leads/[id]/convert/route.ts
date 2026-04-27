// app/api/leads/[id]/convert/route.ts
// Convert a lead into a contact:
// - If a contact already exists with this lead_id, return it (idempotent)
// - Otherwise create a new contact populated from the lead's fields
// - Link the new contact to the lead's project via project_contacts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Fetch the lead
  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
  if (leadErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // 2. Idempotency — if a contact already exists for this lead, return it
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle()

  let contact = existing

  if (!contact) {
    // 3. Create the new contact, copying fields from the lead
    const { data: created, error: createErr } = await supabase
      .from('contacts')
      .insert({
        name: lead.name,
        role: lead.role_clinic ?? null,
        email: lead.contact_email ?? null,
        phone: lead.contact_phone ?? null,
        status: 'active',
        is_repeat: false,
        lead_id: id,
      })
      .select()
      .single()
    if (createErr || !created) {
      return NextResponse.json({ error: createErr?.message ?? 'Failed to create contact' }, { status: 500 })
    }
    contact = created
  }

  // 4. Link contact to lead's project (idempotent — UNIQUE on project_id+contact_id)
  if (lead.project_id) {
    await supabase
      .from('project_contacts')
      .upsert(
        {
          project_id: lead.project_id,
          contact_id: contact.id,
          role_label: 'From lead',
        },
        { onConflict: 'project_id,contact_id', ignoreDuplicates: true },
      )
  }

  return NextResponse.json({ contact })
}
