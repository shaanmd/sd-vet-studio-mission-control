// app/api/newsletter-lists/[id]/route.ts
// GET / PATCH / DELETE for a single newsletter list.
// PATCH supports renaming the list — when name changes, update list_name on
// newsletter_subscriptions and campaigns to keep the denormalized link in sync.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('newsletter_lists')
    .select('*, project:projects(id, name, emoji)')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const allowed = [
    'name', 'description', 'project_id',
    'from_email', 'from_name',
    'brand_primary', 'brand_accent',
  ] as const

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) if (body[key] !== undefined) patch[key] = body[key]

  // If renaming, capture old name so we can sync the denormalized list_name
  // on subscriptions + campaigns.
  let oldName: string | null = null
  if (typeof patch.name === 'string') {
    const { data: existing } = await supabase
      .from('newsletter_lists')
      .select('name')
      .eq('id', id)
      .single()
    oldName = existing?.name ?? null
  }

  const { data, error } = await supabase
    .from('newsletter_lists')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync denormalized name if it changed
  if (oldName && typeof patch.name === 'string' && patch.name !== oldName) {
    await supabase.from('newsletter_subscriptions').update({ list_name: patch.name }).eq('list_name', oldName)
    await supabase.from('campaigns').update({ list_name: patch.name }).eq('list_name', oldName)
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Refuse if the list still has subscribers or campaigns — soft safety
  const { data: list } = await supabase.from('newsletter_lists').select('name').eq('id', id).single()
  if (list?.name) {
    const { count: subCount } = await supabase
      .from('newsletter_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('list_name', list.name)
    if ((subCount ?? 0) > 0) {
      return NextResponse.json({
        error: `Can't delete — list has ${subCount} subscribers. Move or remove them first.`,
      }, { status: 400 })
    }
  }

  const { error } = await supabase.from('newsletter_lists').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
