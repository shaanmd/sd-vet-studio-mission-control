// app/api/contacts/[id]/subscriptions/route.ts
// GET   — list all subscriptions for a contact
// POST  — subscribe contact to a list (upserts: re-subscribing clears unsubscribed_at)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .select('*')
    .eq('contact_id', id)
    .order('subscribed_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const list_name: string | undefined = body.list_name?.trim()
  if (!list_name) return NextResponse.json({ error: 'list_name is required' }, { status: 400 })

  const source_tool = body.source_tool ?? 'resend'
  const external_id = body.external_id ?? null
  const notes = body.notes ?? null
  const now = new Date().toISOString()

  // Upsert: if a row exists for (contact, list), clear unsubscribed_at + bump subscribed_at
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .upsert(
      {
        contact_id: id,
        list_name,
        source_tool,
        external_id,
        notes,
        subscribed_at: now,
        unsubscribed_at: null,
        updated_at: now,
      },
      { onConflict: 'contact_id,list_name' },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
