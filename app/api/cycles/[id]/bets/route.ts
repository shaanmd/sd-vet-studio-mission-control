import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: cycle_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!body.project_id || !body.goal_line?.trim()) {
    return NextResponse.json({ error: 'project_id and goal_line are required' }, { status: 400 })
  }
  const owner = ['shaan', 'deb', 'both'].includes(body.owner) ? body.owner : 'both'

  const { data, error } = await supabase
    .from('cycle_bets')
    .insert({
      cycle_id,
      project_id: body.project_id,
      goal_line: body.goal_line.trim(),
      owner,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
