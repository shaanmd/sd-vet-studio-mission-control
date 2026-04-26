import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('meetings')
    .select('*, project:projects(id, name, emoji)')
    .order('scheduled_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.title || !body.scheduled_at) {
    return NextResponse.json({ error: 'title and scheduled_at are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('meetings')
    .insert({
      title: body.title.trim(),
      meeting_type: body.meeting_type ?? 'cofounder',
      scheduled_at: body.scheduled_at,
      status: body.status ?? 'upcoming',
      agenda: body.agenda ?? null,
      notes: body.notes ?? null,
      action_items: body.action_items ?? [],
      drive_transcript_url: body.drive_transcript_url ?? null,
      linked_project_id: body.linked_project_id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
