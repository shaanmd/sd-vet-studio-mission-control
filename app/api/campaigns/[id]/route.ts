// app/api/campaigns/[id]/route.ts
// GET / PATCH / DELETE for a single campaign.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('campaigns').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const allowed = ['list_name', 'subject', 'preview_text', 'body_markdown'] as const
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) if (body[key] !== undefined) patch[key] = body[key]

  // Once a campaign is sent, it becomes immutable
  const { data: existing } = await supabase.from('campaigns').select('status').eq('id', id).single()
  if (existing?.status === 'sent' || existing?.status === 'sending') {
    return NextResponse.json({ error: `Cannot edit a ${existing.status} campaign` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('campaigns').select('status').eq('id', id).single()
  if (existing?.status === 'sent' || existing?.status === 'sending') {
    return NextResponse.json({ error: `Cannot delete a ${existing.status} campaign` }, { status: 400 })
  }

  const { error } = await supabase.from('campaigns').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
