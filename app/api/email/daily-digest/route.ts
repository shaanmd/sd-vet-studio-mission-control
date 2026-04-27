// app/api/email/daily-digest/route.ts
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const RECIPIENTS = [
  { name: 'Shaan', email: 'drshaan@mockingbirdvets.com.au', assignedTo: 'shaan' },
  { name: 'Deb',   email: 'vetrehab@gmail.com',             assignedTo: 'deb'   },
]

interface TaskRow { title: string; project: string; energy: string | null; due_date: string | null }
interface ProjectRow { emoji: string | null; name: string; stage: string; revenue: number; tasks: number }
interface WinRow { title: string; win_type: string; happened_at: string }

const ENERGY_EMOJI: Record<string, string> = { high: '⚡', medium: '☕', low: '🛋️' }
const TYPE_EMOJI: Record<string, string> = {
  award: '🏆', milestone: '🎯', launch: '🚀', revenue: '💰',
  partnership: '🤝', feedback: '💬', other: '⭐',
}

function buildEmailHtml(
  name: string,
  tasks: TaskRow[],
  projects: ProjectRow[],
  wins: WinRow[],
): string {
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const taskRows = tasks.length === 0
    ? '<p style="color:#9AA5AC;font-size:14px;margin:0;">No next-step tasks right now — head to Mission Control to set some! 🎯</p>'
    : tasks.map((t, i) => {
        const duePill = t.due_date
          ? `<span style="font-size:11px;background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:4px;margin-left:6px;">${new Date(t.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>`
          : ''
        return `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid #F5F0E8;">
            <div style="width:24px;height:24px;border-radius:50%;background:${i === 0 ? '#FBF3DE' : '#F5F0E8'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:${i === 0 ? '#B7791F' : '#9AA5AC'};flex-shrink:0;">${i + 1}</div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;color:#1E2A35;">${t.title}${duePill}</div>
              <div style="font-size:12px;color:#9AA5AC;margin-top:2px;">${t.project} · ${ENERGY_EMOJI[t.energy ?? 'medium'] ?? '☕'} ${t.energy ?? 'medium'} energy</div>
            </div>
          </div>`
      }).join('')

  const projectRows = projects.length === 0 ? '' : projects.map(p => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F5F0E8;">
      <div style="font-size:13px;font-weight:600;color:#1E2A35;">${p.emoji ?? ''} ${p.name}</div>
      <div style="font-size:12px;color:#9AA5AC;">${p.tasks} tasks · $${p.revenue.toFixed(0)} rev</div>
    </div>`).join('')

  const winRows = wins.length === 0 ? '' : wins.slice(0, 3).map(w => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;">
      <span style="font-size:16px;">${TYPE_EMOJI[w.win_type] ?? '⭐'}</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:#1E2A35;">${w.title}</div>
        <div style="font-size:11px;color:#9AA5AC;">${new Date(w.happened_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>`).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E8E2D6;">

    <!-- Header -->
    <div style="background:#1E6B5E;padding:24px 28px;">
      <div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">SD VetStudio · Mission Control</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">Good morning, ${name} 👋</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">${today}</div>
    </div>

    <!-- Next 3 tasks -->
    <div style="padding:24px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:4px;">Your next money moves</div>
      ${taskRows}
    </div>

    ${projects.length > 0 ? `
    <!-- Active projects -->
    <div style="padding:20px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:4px;">Active projects</div>
      ${projectRows}
    </div>` : ''}

    ${wins.length > 0 ? `
    <!-- Recent wins -->
    <div style="padding:20px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:8px;">Recent wins 🏆</div>
      <div style="background:#E8F4F0;border-radius:10px;padding:12px 16px;">${winRows}</div>
    </div>` : ''}

    <!-- CTA -->
    <div style="padding:24px 28px;">
      <a href="${appUrl}" style="display:block;background:#1E6B5E;color:#fff;text-align:center;padding:13px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
        Open Mission Control →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #F5F0E8;">
      <p style="font-size:11px;color:#9AA5AC;margin:0;">SD VetStudio Mission Control · daily digest sent at 7am AEST</p>
    </div>
  </div>
</body>
</html>`
}

export async function GET(req: Request) {
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

  // Fetch shared data once
  const [revenueRes, winsRes, projectsRes] = await Promise.all([
    supabase.from('revenue_entries').select('project_id, amount'),
    supabase.from('wins').select('title, win_type, happened_at').order('happened_at', { ascending: false }).limit(5),
    supabase.from('projects')
      .select('id, name, emoji, stage')
      .in('stage', ['live', 'beta', 'building'])
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  const allRevenue = revenueRes.data ?? []
  const allWins = winsRes.data ?? []
  const activeProjects = projectsRes.data ?? []

  // Task counts per project
  const projectIds = activeProjects.map(p => p.id)
  const taskCountRes = projectIds.length > 0
    ? await supabase.from('tasks').select('project_id').in('project_id', projectIds).eq('completed', false)
    : { data: [] }

  const taskCounts: Record<string, number> = {}
  for (const t of taskCountRes.data ?? []) {
    taskCounts[t.project_id] = (taskCounts[t.project_id] ?? 0) + 1
  }

  const projectRows: ProjectRow[] = activeProjects.map(p => ({
    emoji: p.emoji,
    name: p.name,
    stage: p.stage,
    revenue: allRevenue.filter(r => r.project_id === p.id).reduce((s, r) => s + (r.amount ?? 0), 0),
    tasks: taskCounts[p.id] ?? 0,
  }))

  const results: Array<{ name: string; email: string; status: string }> = []

  for (const recipient of RECIPIENTS) {
    // Tasks assigned to this person (or to 'both')
    const { data: taskData } = await supabase
      .from('tasks')
      .select('title, energy, due_date, project:projects(name, emoji)')
      .in('assigned_to', [recipient.assignedTo, 'both'])
      .eq('is_next_step', true)
      .eq('completed', false)
      .limit(3)

    // Also grab unassigned next-step tasks
    const { data: sharedTaskData } = await supabase
      .from('tasks')
      .select('title, energy, due_date, project:projects(name, emoji)')
      .is('assigned_to', null)
      .eq('is_next_step', true)
      .eq('completed', false)
      .limit(3)

    const personTasks: TaskRow[] = (taskData ?? []).map((t: any) => ({
      title: t.title,
      project: t.project ? `${t.project.emoji ?? ''} ${t.project.name}`.trim() : 'General',
      energy: t.energy,
      due_date: t.due_date ?? null,
    }))

    const sharedTasks: TaskRow[] = (sharedTaskData ?? []).map((t: any) => ({
      title: t.title,
      project: t.project ? `${t.project.emoji ?? ''} ${t.project.name}`.trim() : 'General',
      energy: t.energy,
      due_date: t.due_date ?? null,
    }))

    // Merge: personal tasks first, fill with shared up to 3
    const tasks = [...personTasks, ...sharedTasks].slice(0, 3)

    try {
      await resend.emails.send({
        from: 'Mission Control <noreply@vetalign.com.au>',
        to: recipient.email,
        subject: `Mission Control · ${new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} 🎯`,
        html: buildEmailHtml(recipient.name, tasks, projectRows, allWins as WinRow[]),
      })
      results.push({ name: recipient.name, email: recipient.email, status: 'sent' })
    } catch (err: any) {
      results.push({ name: recipient.name, email: recipient.email, status: `error: ${err.message}` })
    }
  }

  return NextResponse.json({ ok: true, results })
}
