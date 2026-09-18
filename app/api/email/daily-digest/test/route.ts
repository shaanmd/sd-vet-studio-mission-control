// app/api/email/daily-digest/test/route.ts
// Authenticated trigger for the daily digest. Sends the *real* digest
// (tasks/projects/wins) via the shared sender, so this button is the same
// thing the 7am cron will fire — no test stub.
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { sendDailyDigest } from '@/lib/email/daily-digest'

export const dynamic = 'force-dynamic'

export async function POST(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Send with the service-role client so this button reads exactly the same
  // data the cookie-less 7am cron does (see ../route.ts).
  const outcome = await sendDailyDigest(createServiceClient())
  return NextResponse.json(outcome)
}
