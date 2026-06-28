import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { defaultCycleDates } from '@/lib/cycles'
import { aestToday } from '@/lib/queries/cycles'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const starts_on: string = body.starts_on ?? aestToday()
  const defaults = defaultCycleDates(starts_on)
  const ends_on: string = body.ends_on ?? defaults.ends_on
  const cooldown_ends_on: string = body.cooldown_ends_on ?? defaults.cooldown_ends_on

  // Reject a cycle that overlaps an existing one's full [start, cooldown] span.
  const { data: overlap } = await supabase
    .from('cycles')
    .select('id')
    .lte('starts_on', cooldown_ends_on)
    .gte('cooldown_ends_on', starts_on)
    .limit(1)
    .maybeSingle()
  if (overlap) return NextResponse.json({ error: 'A cycle already covers that date range' }, { status: 409 })

  const { count } = await supabase.from('cycles').select('id', { count: 'exact', head: true })
  const name = `Cycle ${(count ?? 0) + 1}`

  const { data, error } = await supabase
    .from('cycles')
    .insert({ name, starts_on, ends_on, cooldown_ends_on, created_by: body.created_by ?? null })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
