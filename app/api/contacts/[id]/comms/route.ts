import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('comms_log')
    .select('*')
    .eq('contact_id', id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { kind, summary, date, logged_by } = body

  if (!summary) return NextResponse.json({ error: 'summary is required' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('comms_log')
    .insert({
      contact_id: id,
      date: date ?? today,
      kind: kind ?? 'note',
      summary,
      logged_by: logged_by ?? 'shaan',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: _contactId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { entry_id } = body

  if (!entry_id) return NextResponse.json({ error: 'entry_id is required' }, { status: 400 })

  const { error } = await supabase
    .from('comms_log')
    .delete()
    .eq('id', entry_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
