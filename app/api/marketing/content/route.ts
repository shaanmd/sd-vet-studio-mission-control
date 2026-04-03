import { createClient } from '@/lib/supabase/server'
import { createContentItem } from '@/lib/queries/marketing'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  await createContentItem({ ...body, created_by: user.id })
  return NextResponse.json({ ok: true })
}
