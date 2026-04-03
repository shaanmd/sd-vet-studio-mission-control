import { createClient } from '@/lib/supabase/server'
import { updateContentItemStatus } from '@/lib/queries/marketing'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { status } = await req.json()
  await updateContentItemStatus(id, status)
  return NextResponse.json({ ok: true })
}
