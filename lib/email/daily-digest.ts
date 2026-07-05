// lib/email/daily-digest.ts
// Builds and sends the daily digest. Used by both the cron route
// (/api/email/daily-digest, runs at 7am AEST) and the manual "Send digest now"
// button in /settings. One source of truth for the email content and the
// Resend send logic.

import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { derivePhase, weekOf, totalWeeks, daysLeft } from '@/lib/cycles'

export interface DigestRecipient {
  name: string
  email: string
  /** Matches tasks.assigned_to values */
  assignedTo: 'shaan' | 'deb'
}

export const DEFAULT_RECIPIENTS: DigestRecipient[] = [
  { name: 'Shaan', email: 'drshaan@mockingbirdvets.com.au', assignedTo: 'shaan' },
  { name: 'Deb',   email: 'drdebvetrehab@gmail.com',        assignedTo: 'deb'   },
]

export interface DigestResult {
  name: string
  email: string
  status: string
  id?: string | null
}

export interface DigestEnv {
  has_resend_key: boolean
  has_cron_secret: boolean
  from: string
}

export interface DigestSendOutcome {
  ok: boolean
  env: DigestEnv
  results: DigestResult[]
  error?: string
}

interface TaskRow { title: string; project: string; energy: string | null; due_date: string | null }
interface ProjectRow { emoji: string | null; name: string; stage: string; revenue: number; tasks: number }
interface WinRow { title: string; win_type: string; happened_at: string }
interface CycleEmailBet { project: string; goal: string; status: string | null; note: string | null }
interface CycleEmailData {
  name: string
  phase: 'active' | 'cooldown'
  weekOf: number
  totalWeeks: number
  daysLeft: number
  cooldownEndsOn: string
  bets: CycleEmailBet[]
}

const ENERGY_EMOJI: Record<string, string> = { high: '⚡', medium: '☕', low: '🛋️' }
const TYPE_EMOJI: Record<string, string> = {
  award: '🏆', milestone: '🎯', launch: '🚀', revenue: '💰',
  partnership: '🤝', feedback: '💬', other: '⭐',
}
const STATUS_LABEL: Record<string, { text: string; bg: string; color: string }> = {
  on_track: { text: 'On track', bg: '#D4F0EE', color: '#1E6B5E' },
  stuck:    { text: 'Stuck',    bg: '#FEF3C7', color: '#92400E' },
  done:     { text: 'Done',     bg: '#EFEAE0', color: '#6B7A82' },
}

function buildCycleSection(cycle: CycleEmailData | null, appUrl: string): string {
  if (!cycle) return ''
  if (cycle.phase === 'cooldown') {
    return `
    <div style="padding:20px 28px 0;">
      <div style="background:#E8F4F0;border-radius:10px;padding:14px 16px;">
        <div style="font-size:14px;font-weight:700;color:#1E6B5E;">Cooldown · rest + small stuff 🛋️</div>
        <div style="font-size:12.5px;color:#6B7A82;margin-top:2px;">${cycle.name} wrapped — next cycle starts when you bet again.</div>
      </div>
    </div>`
  }
  const betRows = cycle.bets.length === 0
    ? '<p style="color:#9AA5AC;font-size:13px;margin:4px 0 0;">No bets set yet — pick your focus projects.</p>'
    : cycle.bets.map((b) => {
        const s = b.status ? STATUS_LABEL[b.status] : null
        const pill = s
          ? `<span style="font-size:11px;background:${s.bg};color:${s.color};padding:1px 8px;border-radius:10px;">${s.text}</span>`
          : `<span style="font-size:11px;background:#F5F0E8;color:#9AA5AC;padding:1px 8px;border-radius:10px;">No check-in yet</span>`
        return `
          <div style="padding:10px 0;border-bottom:1px solid #F5F0E8;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="font-size:13.5px;font-weight:600;color:#1E2A35;">${b.project}</div>
              ${pill}
            </div>
            <div style="font-size:12px;color:#9AA5AC;margin-top:2px;">🎯 ${b.goal}${b.note ? ` · "${b.note}"` : ''}</div>
          </div>`
      }).join('')

  return `
    <div style="padding:20px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:4px;">
        This cycle · Week ${cycle.weekOf} of ${cycle.totalWeeks} · ${cycle.daysLeft} days left
      </div>
      ${betRows}
      <a href="${appUrl}/cycle" style="display:inline-block;margin-top:10px;font-size:12.5px;font-weight:600;color:#1E6B5E;text-decoration:none;">
        Update today's check-in →
      </a>
    </div>`
}

function buildEmailHtml(name: string, tasks: TaskRow[], projects: ProjectRow[], wins: WinRow[], cycle: CycleEmailData | null): string {
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sd-vet-studio-mission-control.vercel.app'

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

  const projectRowsHtml = projects.length === 0 ? '' : projects.map(p => `
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

    <div style="background:#1E6B5E;padding:24px 28px;">
      <div style="font-size:11px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">SD VetStudio · Mission Control</div>
      <div style="font-size:22px;font-weight:700;color:#fff;">Good morning, ${name} 👋</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">${today}</div>
    </div>

    ${buildCycleSection(cycle, appUrl)}

    <div style="padding:24px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:4px;">Your next money moves</div>
      ${taskRows}
    </div>

    ${projects.length > 0 ? `
    <div style="padding:20px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:4px;">Active projects</div>
      ${projectRowsHtml}
    </div>` : ''}

    ${wins.length > 0 ? `
    <div style="padding:20px 28px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#9AA5AC;font-weight:600;margin-bottom:8px;">Recent wins 🏆</div>
      <div style="background:#E8F4F0;border-radius:10px;padding:12px 16px;">${winRows}</div>
    </div>` : ''}

    <div style="padding:24px 28px;">
      <a href="${appUrl}" style="display:block;background:#1E6B5E;color:#fff;text-align:center;padding:13px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none;">
        Open Mission Control →
      </a>
    </div>

    <div style="padding:16px 28px;border-top:1px solid #F5F0E8;">
      <p style="font-size:11px;color:#9AA5AC;margin:0;">SD VetStudio Mission Control · daily digest sent at 7am AEST</p>
    </div>
  </div>
</body>
</html>`
}

function getEnv(): DigestEnv {
  return {
    has_resend_key:  Boolean(process.env.RESEND_API_KEY),
    has_cron_secret: Boolean(process.env.CRON_SECRET),
    from:            process.env.DAILY_DIGEST_FROM ?? 'Mission Control <noreply@sdvetstudio.com>',
  }
}

/**
 * Build and send the daily digest to all recipients.
 * Returns per-recipient outcomes plus env diagnostics.
 */
export async function sendDailyDigest(
  supabase: SupabaseClient,
  recipients: DigestRecipient[] = DEFAULT_RECIPIENTS,
): Promise<DigestSendOutcome> {
  const env = getEnv()

  if (!env.has_resend_key) {
    return {
      ok: false,
      env,
      results: [],
      error: 'RESEND_API_KEY is not set in this deployment',
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  // Shared data: revenue totals, recent wins, active projects
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

  const projectIds = activeProjects.map((p: any) => p.id)
  const taskCountRes = projectIds.length > 0
    ? await supabase.from('tasks').select('project_id').in('project_id', projectIds).eq('completed', false)
    : { data: [] }

  const taskCounts: Record<string, number> = {}
  for (const t of (taskCountRes.data ?? []) as any[]) {
    taskCounts[t.project_id] = (taskCounts[t.project_id] ?? 0) + 1
  }

  const projectRows: ProjectRow[] = activeProjects.map((p: any) => ({
    emoji: p.emoji,
    name: p.name,
    stage: p.stage,
    revenue: allRevenue.filter((r: any) => r.project_id === p.id).reduce((s: number, r: any) => s + (r.amount ?? 0), 0),
    tasks: taskCounts[p.id] ?? 0,
  }))

  // Current cycle (shared across recipients; bets filtered per-recipient below)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' })
  const { data: cycleRow } = await supabase
    .from('cycles')
    .select('*')
    .lte('starts_on', today)
    .gte('cooldown_ends_on', today)
    .order('starts_on', { ascending: false })
    .limit(1)
    .maybeSingle()

  let cycleBetsRaw: any[] = []
  let cyclePhase: 'active' | 'cooldown' | null = null
  if (cycleRow) {
    const phase = derivePhase(cycleRow, today)
    if (phase === 'active' || phase === 'cooldown') cyclePhase = phase
    if (phase === 'active') {
      const { data: betsData } = await supabase
        .from('cycle_bets')
        .select('id, owner, goal_line, project:projects(name)')
        .eq('cycle_id', cycleRow.id)
        .order('sort_order', { ascending: true })
      cycleBetsRaw = betsData ?? []

      // latest check-in per bet
      const betIds = cycleBetsRaw.map((b) => b.id)
      if (betIds.length) {
        const { data: checkins } = await supabase
          .from('bet_checkins')
          .select('bet_id, status, note, checkin_date')
          .in('bet_id', betIds)
          .order('checkin_date', { ascending: false })
        const latest: Record<string, any> = {}
        for (const c of checkins ?? []) if (!latest[c.bet_id]) latest[c.bet_id] = c
        cycleBetsRaw = cycleBetsRaw.map((b) => ({ ...b, checkin: latest[b.id] ?? null }))
      }
    }
  }

  const results: DigestResult[] = []

  for (const recipient of recipients) {
    // Tasks assigned to this person OR to 'both'
    const { data: taskData } = await supabase
      .from('tasks')
      .select('title, energy, due_date, project:projects(name, emoji)')
      .in('assigned_to', [recipient.assignedTo, 'both'])
      .eq('is_next_step', true)
      .eq('completed', false)
      .limit(3)

    // Plus unassigned next-step tasks (shared)
    const { data: sharedTaskData } = await supabase
      .from('tasks')
      .select('title, energy, due_date, project:projects(name, emoji)')
      .is('assigned_to', null)
      .eq('is_next_step', true)
      .eq('completed', false)
      .limit(3)

    const personTasks: TaskRow[] = ((taskData ?? []) as any[]).map((t) => ({
      title: t.title,
      project: t.project ? `${t.project.emoji ?? ''} ${t.project.name}`.trim() : 'General',
      energy: t.energy,
      due_date: t.due_date ?? null,
    }))

    const sharedTasks: TaskRow[] = ((sharedTaskData ?? []) as any[]).map((t) => ({
      title: t.title,
      project: t.project ? `${t.project.emoji ?? ''} ${t.project.name}`.trim() : 'General',
      energy: t.energy,
      due_date: t.due_date ?? null,
    }))

    const tasks = [...personTasks, ...sharedTasks].slice(0, 3)

    const recipientCycle: CycleEmailData | null = cyclePhase && cycleRow
      ? {
          name: cycleRow.name,
          phase: cyclePhase,
          weekOf: weekOf(cycleRow, today),
          totalWeeks: totalWeeks(cycleRow),
          daysLeft: daysLeft(cycleRow, today),
          cooldownEndsOn: cycleRow.cooldown_ends_on,
          bets:
            cyclePhase === 'active'
              ? cycleBetsRaw
                  .filter((b) => b.owner === recipient.assignedTo || b.owner === 'both')
                  .map((b) => ({
                    project: b.project?.name ?? 'Project',
                    goal: b.goal_line,
                    status: b.checkin?.status ?? null,
                    note: b.checkin?.note ?? null,
                  }))
              : [],
        }
      : null

    try {
      const resp = await resend.emails.send({
        from: env.from,
        to: recipient.email,
        subject: `Mission Control · ${new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} 🎯`,
        html: buildEmailHtml(recipient.name, tasks, projectRows, allWins as WinRow[], recipientCycle),
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

  const ok = results.length > 0 && results.every(r => r.status === 'sent')
  return { ok, env, results }
}
