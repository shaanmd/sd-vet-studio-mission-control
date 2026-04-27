// app/api/newsletter-lists/route.ts
// GET  — list all newsletter lists with active subscriber counts
// POST — create a new list (with from-email + brand defaults)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch lists + active subscriber counts (small enough table to aggregate inline)
  const [listsRes, subsRes] = await Promise.all([
    supabase.from('newsletter_lists')
      .select('*, project:projects(id, name, emoji)')
      .order('name'),
    supabase.from('newsletter_subscriptions').select('list_name, unsubscribed_at'),
  ])

  if (listsRes.error) return NextResponse.json({ error: listsRes.error.message }, { status: 500 })

  const counts = new Map<string, { active: number; total: number }>()
  for (const row of subsRes.data ?? []) {
    const c = counts.get(row.list_name) ?? { active: 0, total: 0 }
    c.total += 1
    if (row.unsubscribed_at === null) c.active += 1
    counts.set(row.list_name, c)
  }

  const lists = (listsRes.data ?? []).map((l: any) => ({
    ...l,
    active: counts.get(l.name)?.active ?? 0,
    total:  counts.get(l.name)?.total  ?? 0,
  }))

  return NextResponse.json(lists)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name: string = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const insert = {
    name,
    description: body.description ?? null,
    project_id: body.project_id ?? null,
    from_email: (body.from_email ?? 'noreply@sdvetstudio.com').trim(),
    from_name:  (body.from_name  ?? 'Mission Control').trim(),
    brand_primary: body.brand_primary ?? '#1E6B5E',
    brand_accent:  body.brand_accent  ?? '#D4A853',
  }

  const { data, error } = await supabase
    .from('newsletter_lists')
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
