// app/api/email/daily-digest/test/route.ts
// Authenticated trigger for the daily digest. Used by the "Send test digest"
// button in /settings so we can verify deliverability without waiting for cron.
//
// Calls into the same digest builder by hitting the public route with the
// CRON_SECRET if present, or just falling through if none is configured.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Build absolute URL to the cron route
  const origin = new URL(req.url).origin
  const url = new URL('/api/email/daily-digest', origin)

  const headers: Record<string, string> = {}
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) headers['Authorization'] = `Bearer ${cronSecret}`

  try {
    const res = await fetch(url.toString(), { method: 'GET', headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data?.error ?? `Cron route returned ${res.status}` }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Failed to invoke digest route' }, { status: 500 })
  }
}
