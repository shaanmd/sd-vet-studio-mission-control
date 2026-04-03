import { createClient } from '@/lib/supabase/server'
import { getWins } from '@/lib/queries/activity'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getWins()
  return NextResponse.json(data)
}
