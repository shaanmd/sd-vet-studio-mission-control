// app/api/email/daily-digest/test/route.ts
// Direct test send — bypasses the cron route entirely. Constructs a minimal
// digest-style email and sends via Resend with full diagnostic output, so
// when something fails we know exactly which layer (env missing, domain not
// verified, recipient blocked, network) is the cause.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

// Force fresh execution every call — never cache the response.
export const dynamic = 'force-dynamic'

const RECIPIENTS = [
  { name: 'Shaan', email: 'drshaan@mockingbirdvets.com.au' },
  { name: 'Deb',   email: 'vetrehab@gmail.com' },
]

export async function POST(_req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const env = {
    has_resend_key:  Boolean(process.env.RESEND_API_KEY),
    has_cron_secret: Boolean(process.env.CRON_SECRET),
    from:            process.env.DAILY_DIGEST_FROM ?? 'Mission Control <noreply@sdvetstudio.com>',
  }

  if (!env.has_resend_key) {
    return NextResponse.json({
      ok: false,
      env,
      error: 'RESEND_API_KEY is not set in this deployment',
      results: [],
    }, { status: 500 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  const results: Array<{ name: string; email: string; status: string; id?: string | null }> = []

  for (const recipient of RECIPIENTS) {
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:32px auto;padding:24px;border:1px solid #E8E2D6;border-radius:14px;background:#FBF7EF;">
        <h1 style="font-size:20px;color:#1E6B5E;margin:0 0 8px;">📧 Test digest</h1>
        <p style="font-size:13px;color:#6B7A82;margin:0 0 16px;">Hi ${recipient.name} — this is a test send from Mission Control.</p>
        <p style="font-size:13px;color:#1E2A35;">If you're seeing this, deliverability is working: domain verified, API key valid, route reachable. The real 7am AEST digest will use this same path.</p>
        <p style="font-size:11px;color:#9AA5AC;margin-top:24px;">Sent ${today} · ${env.from}</p>
      </div>`

    try {
      const resp = await resend.emails.send({
        from: env.from,
        to: recipient.email,
        subject: `📧 Mission Control · test digest`,
        html,
      })

      if (resp?.error) {
        const e = resp.error as { name?: string; message?: string }
        results.push({
          name: recipient.name,
          email: recipient.email,
          status: `error: ${e.name ?? 'unknown'} — ${e.message ?? JSON.stringify(resp.error)}`,
        })
      } else {
        results.push({
          name: recipient.name,
          email: recipient.email,
          status: 'sent',
          id: resp?.data?.id ?? null,
        })
      }
    } catch (err: any) {
      results.push({
        name: recipient.name,
        email: recipient.email,
        status: `error: ${err?.name ?? 'thrown'} — ${err?.message ?? String(err)}`,
      })
    }
  }

  const allSent = results.length > 0 && results.every(r => r.status === 'sent')
  return NextResponse.json({ ok: allSent, env, results })
}
