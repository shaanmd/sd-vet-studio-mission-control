// app/api/finance/expenses/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.description || !body.amount || !body.category || !body.paid_by) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase
    .from('expenses')
    .insert({
      description: body.description,
      amount: body.amount,
      category: body.category,
      project_id: body.project_id ?? null,
      paid_by: body.paid_by,
      expense_date: body.expense_date ?? new Date().toISOString().split('T')[0],
      created_by: user.id,
    })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
