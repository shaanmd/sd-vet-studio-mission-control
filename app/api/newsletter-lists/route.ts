// app/api/newsletter-lists/route.ts
// Returns each distinct newsletter list with active subscriber count.
// Used by the campaign composer's audience picker.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Pull all subscriptions (small enough table to aggregate in-app for now)
  const { data, error } = await supabase
    .from('newsletter_subscriptions')
    .select('list_name, unsubscribed_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = new Map<string, { active: number; total: number }>()
  for (const row of data ?? []) {
    const c = counts.get(row.list_name) ?? { active: 0, total: 0 }
    c.total += 1
    if (row.unsubscribed_at === null) c.active += 1
    counts.set(row.list_name, c)
  }

  const lists = Array.from(counts.entries())
    .map(([name, { active, total }]) => ({ name, active, total }))
    .sort((a, b) => b.active - a.active)

  return NextResponse.json(lists)
}
