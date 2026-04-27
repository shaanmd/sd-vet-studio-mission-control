import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  // Whitelist columns. Includes pipeline fields lifted from the old leads model.
  const allowed = [
    'name', 'company', 'role', 'email', 'phone',
    'location', 'website', 'linkedin',
    'status', 'is_repeat',
    'lifecycle_stage', 'interest_level', 'source_channel', 'brought_in_by',
    'source', 'is_beta_tester',
    'comms_style', 'decision_style', 'personal_context', 'future_opportunities',
    'lead_id',
  ] as const

  const values: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) values[key] = body[key]
  }

  // Sensible defaults
  values.status          ??= 'active'
  values.is_repeat       ??= false
  values.lifecycle_stage ??= 'customer'
  values.is_beta_tester  ??= false

  const { data, error } = await supabase
    .from('contacts')
    .insert(values)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
