// app/api/email/daily-digest/route.ts
// Sends daily task digest to Shaan and Deb.
// Trigger via Vercel Cron (see vercel.json) or call manually at /api/email/daily-digest
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const RECIPIENTS = [
  { name: 'Shaan', email: 'vet@vetalign.com.au' },
  { name: 'Deb', email: 'vetrehab@gmail.com' },
]

function buildEmailHtml(name: string, tasks: Array<{ title: string; project: string; energy: string | null }>): string {
  const ENERGY_EMOJI: Record<string, string> = { high: '⚡', medium: '☕', low: '🛋️' }
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  const taskRows = tasks.length === 0
    ? '<p style="color:#9AA5AC;font-size:14px;">No tasks flagged as next step right now. Head to Mission Control to set some! 🎯</p>'
    : tasks.map((t, i) => `
      <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #F5F0E8;">
        <div style="width:24px;height:24px;border-radius:50%;background:${i === 0 ? '#FBF3DE' : '#F5F0E8'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:${i === 0 ? '#B7791F' : '#9AA5AC'};flex-shrink:0;">${i + 1}</div>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:600;color:#1E2A35;">${t.title}</div>
          <div style="font-size:12px;color:#9AA5AC;margin-top:2px;">${t.project} · ${ENERGY_EMOJI[t.energy ?? 'medium'] ?? '☕'} ${t.energy ?? 'medium'} energy</div>
        </div>
      </div>
    `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E8E2D6;">
        <!-- Header -->
        <div style="background:#1E6B5E;padding:24px 28px;">
          <div style="font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">SD VetStudio · Mission Control</div>
          <div style="font-size:22px;font-weight:700;color:#fff;">Good morning, ${name} 👋</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">${today}</div>
        </div>

        <!-- Tasks -->
        <div style="padding:24px 28px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:12px;">Your next money moves</div>
          ${taskRows}
        </div>

        <!-- CTA -->
        <div style="padding:0 28px 28px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}" style="display:block;background:#1E6B5E;color:#fff;text-align:center;padding:12px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
            Open Mission Control →
          </a>
        </div>

        <!-- Footer -->
        <div style="padding:16px 28px;border-top:1px solid #F5F0E8;">
          <p style="font-size:11px;color:#9AA5AC;margin:0;">You're receiving this because you're a Mission Control user. This email is sent daily at 7am AEST.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export async function GET(req: Request) {
  // Vercel cron sends Authorization: Bearer CRON_SECRET header
  // Also accept ?secret= for manual testing
  const authHeader = req.headers.get('authorization')
  const { searchParams } = new URL(req.url)
  const querySecret = searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const validHeader = authHeader === `Bearer ${cronSecret}`
    const validQuery = querySecret === cronSecret
    if (!validHeader && !validQuery) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createClient()

  // Fetch all profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')

  const results: Array<{ name: string; email: string; status: string }> = []

  for (const recipient of RECIPIENTS) {
    const profile = (profiles ?? []).find((p: any) =>
      p.name === recipient.name || p.name?.toLowerCase() === recipient.name.toLowerCase()
    )

    let tasks: Array<{ title: string; project: string; energy: string | null }> = []

    if (profile) {
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title, energy, project:projects(name, emoji)')
        .eq('assigned_to', profile.id)
        .eq('is_next_step', true)
        .eq('completed', false)
        .limit(3)

      tasks = (taskData ?? []).map((t: any) => ({
        title: t.title,
        project: t.project ? `${t.project.emoji ?? ''} ${t.project.name}`.trim() : 'General',
        energy: t.energy,
      }))
    }

    try {
      await resend.emails.send({
        from: 'Mission Control <noreply@vetalign.com.au>',
        to: recipient.email,
        subject: `Your next 3 for ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })} 🎯`,
        html: buildEmailHtml(recipient.name, tasks),
      })
      results.push({ name: recipient.name, email: recipient.email, status: 'sent' })
    } catch (err: any) {
      results.push({ name: recipient.name, email: recipient.email, status: `error: ${err.message}` })
    }
  }

  return NextResponse.json({ ok: true, results })
}
