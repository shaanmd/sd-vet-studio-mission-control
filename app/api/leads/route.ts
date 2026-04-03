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
  const lead = await createLead({ ...body, added_by: user.id })
  return NextResponse.json(lead)
}
