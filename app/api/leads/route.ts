import { createClient } from '@/lib/supabase/server'
import { createLead } from '@/lib/queries/leads'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('leads')
    .select('*, project:projects(name, emoji), added_by_profile:profiles!leads_added_by_fkey(name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name || !body.project_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Whitelist columns that actually exist on the leads table.
  // `notes` and `links` come from the form but live in separate tables / aren't modeled yet.
  const allowed = [
    'project_id', 'name', 'role_clinic', 'contact_email', 'contact_phone',
    'source', 'source_channel', 'brought_in_by',
    'interest_level', 'is_beta_tester', 'status',
  ] as const
  const values: Record<string, unknown> = { added_by: user.id }
  for (const key of allowed) {
    if (body[key] !== undefined) values[key] = body[key]
  }

  try {
    const lead = await createLead(values as Parameters<typeof createLead>[0])
    return NextResponse.json(lead)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed to create lead' }, { status: 500 })
  }
}
