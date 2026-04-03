import { createClient } from '@/lib/supabase/server'
import { addLeadNote } from '@/lib/queries/leads'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  await addLeadNote(id, content, user.id)
  return NextResponse.json({ ok: true })
}
