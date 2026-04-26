// app/api/settings/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')
  const supabase = await createClient()
  const query = supabase.from('settings').select('key, value')
  const { data } = key ? await query.eq('key', key).single() : await query
  return NextResponse.json(data ?? null)
}

export async function POST(req: Request) {
  const { key, value } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
