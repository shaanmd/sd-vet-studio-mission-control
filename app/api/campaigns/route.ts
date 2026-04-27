// app/api/campaigns/route.ts
// GET   — list all campaigns (ordered by recency)
// POST  — create a new draft campaign
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const list_name: string = (body.list_name ?? '').trim()
  if (!list_name) return NextResponse.json({ error: 'list_name is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      list_name,
      subject: (body.subject ?? '').trim() || '',
      preview_text: body.preview_text ?? null,
      body_markdown: body.body_markdown ?? '',
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
