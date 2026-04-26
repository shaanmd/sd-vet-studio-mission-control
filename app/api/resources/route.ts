import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, url, description, category, icon } = body

  const { data: existing } = await supabase
    .from('resources')
    .select('sort_order')
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const sort_order = (existing?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('resources')
    .insert({ name, url, description: description ?? null, category, icon: icon || '🔗', sort_order })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
