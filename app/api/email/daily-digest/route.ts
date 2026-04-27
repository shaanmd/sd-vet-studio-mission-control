// app/api/email/daily-digest/route.ts
// Cron endpoint hit by Vercel at 7am AEST every day. Delegates to the shared
// digest sender in lib/email/daily-digest so the manual "Send digest now"
// button uses the exact same code path.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDailyDigest } from '@/lib/email/daily-digest'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Vercel cron sends `Authorization: Bearer $CRON_SECRET`. Allow `?secret=`
  // as well for manual curl testing.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    const querySecret = new URL(req.url).searchParams.get('secret')
    const ok = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const outcome = await sendDailyDigest(supabase)
  return NextResponse.json(outcome)
}
