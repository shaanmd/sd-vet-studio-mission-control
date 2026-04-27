// app/api/contacts/[id]/subscriptions/[subId]/route.ts
// PATCH  — toggle unsubscribe / resubscribe (also accepts list_name, notes, external_id changes)
// DELETE — hard delete the subscription row (use rarely; prefer unsubscribe)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { id, subId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['list_name', 'unsubscribed_at', 'subscribed_at', 'source_tool', 'external_id', 'notes'] as const
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) if (body[key] !== undefined) patch[key] = body[key]

  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .update(patch)
    .eq('id', subId)
    .eq('contact_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; subId: string }> }) {
  const { id, subId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('newsletter_subscriptions')
    .delete()
    .eq('id', subId)
    .eq('contact_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
