import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aestToday } from '@/lib/queries/cycles'

export async function POST(req: Request, { params }: { params: Promise<{ betId: string }> }) {
  const { betId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!['on_track', 'stuck', 'done'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be on_track | stuck | done' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('bet_checkins')
    .upsert(
      {
        bet_id: betId,
        checkin_date: aestToday(),
        status: body.status,
        note: body.note?.trim() || null,
        created_by: body.created_by ?? null,
      },
      { onConflict: 'bet_id,checkin_date' },
    )
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
