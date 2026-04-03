import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.description || !body.amount || !body.stream) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const { error } = await supabase
    .from('revenue_entries')
    .insert({
      description: body.description,
      amount: body.amount,
      stream: body.stream,
      project_id: body.project_id ?? null,
      revenue_date: body.revenue_date ?? new Date().toISOString().split('T')[0],
      created_by: user.id,
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
