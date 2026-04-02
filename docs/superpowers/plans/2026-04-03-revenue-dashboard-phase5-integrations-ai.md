# Revenue-First Dashboard — Phase 5: Integrations & AI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up GitHub/Vercel auto-status (hourly edge function), Slack bot (daily digest + slash commands), and Claude AI features (next step suggestions, energy tagging, win wall summary).

**Architecture:** GitHub/Vercel: Supabase edge function (Deno), runs on cron. Slack: Supabase edge functions as webhook handlers (NOT Next.js API routes — Slack requires public HTTPS with fast response). Claude API: called from Next.js API routes for UI-triggered AI and from Supabase edge functions for scheduled AI.

**Tech Stack:** Supabase Edge Functions (Deno), Slack API, GitHub REST API, Vercel REST API, Anthropic Claude API (`claude-sonnet-4-6`).

**Prerequisite:** Phases 1–4 complete. You'll need: GitHub personal access token, Vercel API token, Slack app credentials, Anthropic API key — all stored in Supabase secrets.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/functions/sync-github-vercel/index.ts` | Hourly GitHub + Vercel cache refresh |
| Create | `supabase/functions/slack-events/index.ts` | Slack event handler (bot messages) |
| Create | `supabase/functions/slack-commands/index.ts` | Slack slash command handler |
| Create | `supabase/functions/slack-digest/index.ts` | Daily digest sender |
| Create | `app/api/ai/next-step/route.ts` | Claude next-step suggestion |
| Create | `app/api/ai/energy-tag/route.ts` | Claude energy level suggestion |
| Create | `app/api/ai/win-summary/route.ts` | Claude monthly win summary |
| Modify | `app/settings/page.tsx` | Add Slack + GitHub/Vercel token config UI |
| Modify | `components/project-detail/TaskList.tsx` | Call /api/ai/next-step after task completion |

---

### Task 1: Store Secrets in Supabase

- [ ] **Step 1: Add all required secrets to Supabase**

Run these commands with your actual values:

```bash
npx supabase secrets set GITHUB_TOKEN=<your_github_pat>
npx supabase secrets set VERCEL_TOKEN=<your_vercel_token>
npx supabase secrets set SLACK_BOT_TOKEN=<your_slack_bot_token>
npx supabase secrets set SLACK_SIGNING_SECRET=<your_slack_signing_secret>
npx supabase secrets set ANTHROPIC_API_KEY=<your_anthropic_api_key>
```

- [ ] **Step 2: Add app URL to Supabase secrets**

```bash
npx supabase secrets set APP_URL=https://your-vercel-deployment-url.vercel.app
```

- [ ] **Step 3: Add the same secrets to Vercel environment variables for the Next.js app**

In Vercel dashboard → Project → Settings → Environment Variables, add:
- `ANTHROPIC_API_KEY` — for Claude API calls from Next.js

---

### Task 2: GitHub + Vercel Cache Edge Function

**Files:**
- Create: `supabase/functions/sync-github-vercel/index.ts`

- [ ] **Step 1: Write the edge function**

```typescript
// supabase/functions/sync-github-vercel/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN')!
const VERCEL_TOKEN = Deno.env.get('VERCEL_TOKEN')!

async function fetchGithub(path: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
  })
  if (!res.ok) return null
  return res.json()
}

async function fetchVercel(path: string) {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
  })
  if (!res.ok) return null
  return res.json()
}

Deno.serve(async () => {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, github_repo, vercel_project_id')
    .or('github_repo.not.is.null,vercel_project_id.not.is.null')

  if (!projects?.length) return new Response('No projects to sync', { status: 200 })

  for (const project of projects) {
    const cache: Record<string, unknown> = { project_id: project.id, updated_at: new Date().toISOString() }

    if (project.github_repo) {
      const [commits, prs] = await Promise.all([
        fetchGithub(`/repos/${project.github_repo}/commits?per_page=1`),
        fetchGithub(`/repos/${project.github_repo}/pulls?state=open`),
      ])
      if (commits?.[0]) {
        cache.last_commit_message = commits[0].commit.message.split('\n')[0].slice(0, 200)
        cache.last_commit_author = commits[0].commit.author.name
        cache.last_commit_at = commits[0].commit.author.date
      }
      if (prs) cache.open_prs = prs.length
    }

    if (project.vercel_project_id) {
      const deployments = await fetchVercel(`/v6/deployments?projectId=${project.vercel_project_id}&limit=1`)
      const latest = deployments?.deployments?.[0]
      if (latest) {
        cache.deploy_status = latest.state === 'READY' ? 'ready' : latest.state === 'ERROR' ? 'error' : 'building'
        cache.deploy_url = `https://${latest.url}`
      }
    }

    await supabase.from('github_cache').upsert(cache, { onConflict: 'project_id' })
  }

  return new Response(JSON.stringify({ synced: projects.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy the edge function**

```bash
npx supabase functions deploy sync-github-vercel
```

Expected output: Function deployed at `https://<project-ref>.supabase.co/functions/v1/sync-github-vercel`

- [ ] **Step 3: Set up hourly cron schedule in Supabase**

In Supabase dashboard → Database → Extensions, enable `pg_cron`. Then run in SQL editor:

```sql
SELECT cron.schedule(
  'sync-github-vercel-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-github-vercel',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )
  $$
);
```

Replace `<project-ref>` with your Supabase project ref and `<service-role-key>` with your service role key.

- [ ] **Step 4: Verify by calling the function manually**

```bash
npx supabase functions serve sync-github-vercel
curl http://localhost:54321/functions/v1/sync-github-vercel
```

Expected: `{"synced": N}` where N is number of projects with GitHub/Vercel configured.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/sync-github-vercel/
git commit -m "feat: GitHub + Vercel cache edge function with hourly cron"
```

---

### Task 3: Slack Bot — Daily Digest

**Files:**
- Create: `supabase/functions/slack-digest/index.ts`

- [ ] **Step 1: Write the daily digest function**

```typescript
// supabase/functions/slack-digest/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!

async function postSlackMessage(channel: string, text: string, blocks?: unknown[]) {
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    body: JSON.stringify({ channel, text, blocks }),
  })
}

Deno.serve(async () => {
  // Get all profiles with slack_user_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, slack_user_id')
    .not('slack_user_id', 'is', null)

  if (!profiles?.length) return new Response('No Slack users configured', { status: 200 })

  // Get all active (non-completed) tasks with their projects, ordered by revenue score
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, project:projects(name, emoji, revenue_score, pinned, stage)')
    .eq('completed', false)
    .in('projects.stage', ['exploring', 'building', 'live'])
    .not('projects', 'is', null)

  // Get today's revenue
  const today = new Date().toISOString().split('T')[0]
  const { data: todayRevenue } = await supabase
    .from('revenue_entries')
    .select('amount')
    .eq('revenue_date', today)

  const todayTotal = (todayRevenue ?? []).reduce((sum: number, r: any) => sum + r.amount, 0)

  const REVENUE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }

  const sortedTasks = (tasks ?? []).sort((a: any, b: any) => {
    if (a.project.pinned !== b.project.pinned) return a.project.pinned ? -1 : 1
    return (REVENUE_RANK[b.project.revenue_score] ?? 0) - (REVENUE_RANK[a.project.revenue_score] ?? 0)
  })

  const top3 = sortedTasks.slice(0, 3)

  for (const profile of profiles) {
    const taskLines = top3.map((t: any, i: number) =>
      `${i + 1}. ${t.project.emoji} *${t.project.name}* — ${t.title}`
    ).join('\n')

    const revenueLine = todayTotal > 0
      ? `💰 Revenue today: *$${todayTotal.toFixed(2)}*`
      : '💰 No revenue logged today yet'

    const text = `Good morning, ${profile.name}! Here are your top money moves for today:\n\n${taskLines}\n\n${revenueLine}`

    await postSlackMessage(profile.slack_user_id, text)
  }

  return new Response(JSON.stringify({ sent: profiles.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy the digest function**

```bash
npx supabase functions deploy slack-digest
```

- [ ] **Step 3: Schedule daily digest at 8am (adjust timezone in cron if needed)**

In Supabase SQL editor:

```sql
SELECT cron.schedule(
  'slack-daily-digest',
  '0 20 * * *',  -- 8pm UTC = 8am AEST (UTC+10)
  $$
  SELECT net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/slack-digest',
    headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
  )
  $$
);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/slack-digest/
git commit -m "feat: Slack daily digest edge function — top 3 money moves + today's revenue"
```

---

### Task 4: Slack Slash Commands

**Files:**
- Create: `supabase/functions/slack-commands/index.ts`

- [ ] **Step 1: Write the slash command handler**

```typescript
// supabase/functions/slack-commands/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function respond(text: string) {
  return new Response(JSON.stringify({ response_type: 'in_channel', text }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const body = await req.formData()
  const command = body.get('command')?.toString() ?? ''
  const text = (body.get('text')?.toString() ?? '').trim()
  const userId = body.get('user_id')?.toString() ?? ''

  // Find the profile for this Slack user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('slack_user_id', userId)
    .maybeSingle()

  if (!profile) return respond('❌ Your Slack user is not linked to Mission Control. Ask Shaan to set it up in Settings.')

  // /mc add "project idea"
  if (text.startsWith('add ')) {
    const name = text.slice(4).replace(/^"|"$/g, '').trim()
    if (!name) return respond('Usage: `/mc add "Your project idea"`')
    const { data } = await supabase
      .from('projects')
      .insert({ name, stage: 'inbox', revenue_score: 'low', created_by: profile.id, emoji: '📥' })
      .select('id, name')
      .single()
    return respond(`✅ Added *${data?.name}* to your Inbox!`)
  }

  // /mc done "task name"
  if (text.startsWith('done ')) {
    const title = text.slice(5).replace(/^"|"$/g, '').trim()
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, project:projects(name)')
      .ilike('title', `%${title}%`)
      .eq('completed', false)
      .limit(1)
    if (!tasks?.length) return respond(`❌ No active task found matching "${title}"`)
    const task = tasks[0] as any
    await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString(), completed_by: profile.id }).eq('id', task.id)
    return respond(`✅ Marked *${task.title}* as done! 🎉`)
  }

  // /mc revenue $500 "description"
  if (text.startsWith('revenue ')) {
    const parts = text.match(/revenue\s+\$?([\d.]+)\s+"(.+)"/)
    if (!parts) return respond('Usage: `/mc revenue $500 "VetScribe — 3 new subs"`')
    const amount = parseFloat(parts[1])
    const description = parts[2]
    await supabase.from('revenue_entries').insert({ amount, description, stream: 'other', created_by: profile.id, revenue_date: new Date().toISOString().split('T')[0] })
    return respond(`💰 Logged *$${amount.toFixed(2)}* — ${description}`)
  }

  // /mc expense $25 "description" category
  if (text.startsWith('expense ')) {
    const parts = text.match(/expense\s+\$?([\d.]+)\s+"(.+)"\s*(\w*)/)
    if (!parts) return respond('Usage: `/mc expense $25 "Supabase March" hosting`')
    const amount = parseFloat(parts[1])
    const description = parts[2]
    const category = parts[3] || 'other'
    const validCategories = ['hosting', 'domains', 'subscriptions', 'tools_ai', 'marketing', 'other']
    const cat = validCategories.includes(category) ? category : 'other'
    await supabase.from('expenses').insert({ amount, description, category: cat, paid_by: 'shaan', created_by: profile.id, expense_date: new Date().toISOString().split('T')[0] })
    return respond(`💸 Logged expense: *${description}* — $${amount.toFixed(2)} (${cat}, Shaan paid)`)
  }

  // /mc next "ProjectName" "task description"
  if (text.startsWith('next ')) {
    const parts = text.match(/next\s+"(.+)"\s+"(.+)"/)
    if (!parts) return respond('Usage: `/mc next "Project Name" "Next task"`')
    const projectName = parts[1]
    const taskTitle = parts[2]
    const { data: projects } = await supabase.from('projects').select('id').ilike('name', `%${projectName}%`).limit(1)
    if (!projects?.length) return respond(`❌ No project found matching "${projectName}"`)
    const projectId = projects[0].id
    await supabase.from('tasks').update({ is_next_step: false }).eq('project_id', projectId)
    const { data: existing } = await supabase.from('tasks').select('id').eq('project_id', projectId).ilike('title', `%${taskTitle}%`).limit(1)
    if (existing?.length) {
      await supabase.from('tasks').update({ is_next_step: true }).eq('id', existing[0].id)
    } else {
      await supabase.from('tasks').insert({ project_id: projectId, title: taskTitle, is_next_step: true, created_by: profile.id })
    }
    return respond(`✅ Next step for *${projectName}* set to: "${taskTitle}"`)
  }

  return respond(`Available commands:\n• \`/mc add "idea"\` — add to Inbox\n• \`/mc done "task"\` — mark task complete\n• \`/mc revenue $500 "description"\` — log revenue\n• \`/mc expense $25 "description" category\` — log expense\n• \`/mc next "Project" "task"\` — set next step`)
})
```

- [ ] **Step 2: Deploy the slash command handler**

```bash
npx supabase functions deploy slack-commands
```

- [ ] **Step 3: Configure Slack app**

In the Slack API dashboard (api.slack.com):
1. Create a new app (or use existing)
2. Under "Slash Commands", add `/mc` pointing to: `https://<project-ref>.supabase.co/functions/v1/slack-commands`
3. Under "OAuth & Permissions", add bot scopes: `chat:write`, `commands`
4. Install the app to your workspace

- [ ] **Step 4: Test the slash command**

In Slack, type: `/mc add "Test project from Slack"`

Expected: "✅ Added *Test project from Slack* to your Inbox!"

Verify the project appears in the app at `/projects`.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/slack-commands/
git commit -m "feat: Slack slash commands — /mc add, done, revenue, expense, next"
```

---

### Task 5: Claude AI — Next Step Suggestion

**Files:**
- Create: `app/api/ai/next-step/route.ts`

- [ ] **Step 1: Write the next-step suggestion API route**

```typescript
// app/api/ai/next-step/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase'
import { getProject, getProjectTasks, getProjectNotes } from '@/lib/queries/projects'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const [project, tasks, notes] = await Promise.all([
    getProject(projectId),
    getProjectTasks(projectId),
    getProjectNotes(projectId),
  ])

  const activeTasks = tasks.filter(t => !t.completed)
  const recentNotes = notes.slice(0, 5).map(n => n.content).join('\n')

  const prompt = `You are helping a veterinary digital product business decide what to work on next.

Project: ${project.name}
Description: ${project.summary ?? 'No description'}
Revenue stream: ${project.revenue_stream ?? 'unknown'}
Revenue score: ${project.revenue_score}
Stage: ${project.stage}

Active tasks:
${activeTasks.map(t => `- ${t.title}`).join('\n') || 'None'}

Recent notes:
${recentNotes || 'None'}

Suggest ONE specific next step that will most move this project forward towards revenue. Be concrete and actionable. Reply with just the task title (max 10 words), nothing else.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 50,
    messages: [{ role: 'user', content: prompt }],
  })

  const suggestion = (message.content[0] as { text: string }).text.trim()
  return NextResponse.json({ suggestion })
}
```

- [ ] **Step 2: Wire the suggestion into the Task completion flow**

In `components/project-detail/TaskList.tsx` (or whichever component handles task completion), after a task is marked complete, call the endpoint and show the suggestion:

```typescript
// After completing a task in the TaskList component:
async function handleComplete(taskId: string) {
  await fetch(`/api/tasks/${taskId}/complete`, { method: 'PATCH' })
  // Ask Claude for the next step
  const res = await fetch('/api/ai/next-step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  })
  const { suggestion } = await res.json()
  if (suggestion) {
    setSuggestedNextStep(suggestion)  // show in a modal/banner
  }
  router.refresh()
}
```

Show the suggestion in a small bottom sheet or toast:
```tsx
{suggestedNextStep && (
  <div className="fixed bottom-24 left-4 right-4 bg-teal-700 text-white rounded-xl p-4 shadow-lg z-50">
    <div className="text-xs opacity-80 mb-1">AI suggests next step:</div>
    <div className="font-semibold mb-3">{suggestedNextStep}</div>
    <div className="flex gap-2">
      <button onClick={() => handleAcceptSuggestion(suggestedNextStep)} className="flex-1 bg-white text-teal-700 rounded-lg py-2 text-sm font-medium">Accept</button>
      <button onClick={() => setSuggestedNextStep(null)} className="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm">Dismiss</button>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/ai/next-step/route.ts
git commit -m "feat: Claude next-step suggestion after task completion"
```

---

### Task 6: Claude AI — Energy Tagging + Win Summary

**Files:**
- Create: `app/api/ai/energy-tag/route.ts`
- Create: `app/api/ai/win-summary/route.ts`

- [ ] **Step 1: Write energy-tag route**

```typescript
// app/api/ai/energy-tag/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskTitle, projectContext } = await req.json()

  const prompt = `Categorise the cognitive energy required to complete this task. Reply with exactly one word: "high", "medium", or "low".

Task: ${taskTitle}
Project context: ${projectContext ?? ''}

Rules:
- high = requires deep focus, creative thinking, or complex problem-solving
- medium = straightforward work that needs concentration but not deep thought
- low = routine, mechanical, or administrative tasks you can do when tired

Reply with only: high, medium, or low`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5,
    messages: [{ role: 'user', content: prompt }],
  })

  const energy = (message.content[0] as { text: string }).text.trim().toLowerCase()
  const validEnergy = ['high', 'medium', 'low'].includes(energy) ? energy : 'medium'
  return NextResponse.json({ energy: validEnergy })
}
```

- [ ] **Step 2: Wire energy tagging into task creation**

In the task creation flow (inline add row in TaskList), after saving a new task, call the energy endpoint and update the task:

```typescript
// After inserting the new task:
const energyRes = await fetch('/api/ai/energy-tag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ taskTitle: newTaskTitle, projectContext: project.summary }),
})
const { energy } = await energyRes.json()
// Update the task with suggested energy — show as a dismissable suggestion, not auto-applied
setEnergySuggestion(energy)
```

- [ ] **Step 3: Write win-summary route**

```typescript
// app/api/ai/win-summary/route.ts
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase'
import { getWins } from '@/lib/queries/activity'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get wins from the current month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: wins } = await supabase
    .from('activity_log')
    .select('description, created_at, project:projects(name)')
    .eq('is_win', true)
    .gte('created_at', monthStart.toISOString())
    .order('created_at', { ascending: false })

  if (!wins?.length) return NextResponse.json({ summary: null })

  const winList = wins.map((w: any) => `- ${w.description}${w.project ? ` (${w.project.name})` : ''}`).join('\n')
  const month = monthStart.toLocaleString('en-AU', { month: 'long' })

  const prompt = `Write a warm, encouraging 2-3 sentence summary of what this veterinary digital product team accomplished in ${month}. Be specific about what they shipped or achieved. Celebrate the wins without being over-the-top.

Wins:
${winList}

Write only the summary, no preamble.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  })

  const summary = (message.content[0] as { text: string }).text.trim()
  return NextResponse.json({ summary })
}
```

- [ ] **Step 4: Show win summary on Win Wall**

In `components/log/WinWall.tsx`, add a button "Generate monthly summary" that calls `/api/ai/win-summary` and displays the result at the top of the wall.

```tsx
// Add to WinWall component:
const [summary, setSummary] = useState<string | null>(null)
const [generating, setGenerating] = useState(false)

async function generateSummary() {
  setGenerating(true)
  const res = await fetch('/api/ai/win-summary')
  const { summary } = await res.json()
  setSummary(summary)
  setGenerating(false)
}

// In JSX, above the wins list:
{summary && (
  <div className="bg-amber-50 rounded-xl p-4 mb-4 text-sm text-amber-800 border border-amber-100">
    <div className="font-semibold mb-1">🎉 This month in review</div>
    {summary}
  </div>
)}
{!summary && wins.length > 0 && (
  <button onClick={generateSummary} disabled={generating} className="w-full py-2 bg-amber-50 text-amber-700 text-sm font-medium rounded-xl mb-4 disabled:opacity-50">
    {generating ? 'Generating…' : '✨ Generate monthly summary'}
  </button>
)}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/ai/
git commit -m "feat: Claude AI — energy tagging, win wall monthly summary"
```

---

### Task 7: Settings — Integration Configuration UI

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Replace Slack and GitHub/Vercel placeholders in Settings**

Read `app/settings/page.tsx` (written in Phase 4), then replace the placeholder Slack and GitHub/Vercel sections with actual config forms. The forms POST to new API routes that update the user's profile (slack_user_id) and project-level GitHub/Vercel fields.

```tsx
// Replace the Slack placeholder section with:
<div className="bg-white rounded-xl p-5 mb-4">
  <h2 className="font-semibold text-gray-700 mb-3">Slack</h2>
  <div className="text-sm text-gray-600 mb-3">
    <div className="mb-1"><span className="text-gray-400">Your Slack user ID:</span> {profile?.slack_user_id ?? <span className="text-amber-600">Not configured</span>}</div>
  </div>
  <form action="/api/settings/slack" method="POST" className="flex gap-2">
    <input name="slack_user_id" placeholder="U0XXXXXXX" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" defaultValue={profile?.slack_user_id ?? ''} />
    <button type="submit" className="bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">Save</button>
  </form>
  <p className="text-xs text-gray-400 mt-2">Find your Slack user ID: Profile → ··· → Copy member ID</p>
</div>
```

- [ ] **Step 2: Add API route for settings updates**

```typescript
// app/api/settings/slack/route.ts
import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.formData()
  const slackUserId = body.get('slack_user_id')?.toString().trim()
  await supabase.from('profiles').update({ slack_user_id: slackUserId || null }).eq('id', user.id)
  return NextResponse.redirect(new URL('/settings', req.url))
}
```

- [ ] **Step 3: Commit**

```bash
git add app/settings/page.tsx app/api/settings/
git commit -m "feat: settings — Slack user ID config UI"
```

---

### Task 8: Phase 5 Smoke Test

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: End-to-end integration test**

Manually verify:
1. Create a project with a GitHub repo — verify the github_cache updates after running the sync function manually
2. Complete a task — verify the AI suggests a next step
3. Add a new task — verify AI energy suggestion appears
4. Type `/mc add "test"` in Slack — verify project appears in app Inbox
5. Type `/mc revenue $50 "test sale"` in Slack — verify revenue appears in Finance screen

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "fix: phase 5 smoke test — all integrations verified"
```

**Phase 5 complete.** The app is fully integrated — GitHub/Vercel auto-status, Slack daily digest + slash commands, Claude AI suggestions. The Revenue-First Dashboard is production-ready.

---

## Summary — All Phases

| Phase | What it delivers |
|-------|-----------------|
| Phase 1 | Schema, types, revenue sort utility, navigation shell |
| Phase 2 | Home (Revenue Dashboard), Projects, Project Detail |
| Phase 3 | Finance — expenses + revenue with paid-by tracking |
| Phase 4 | Marketing, Leads, Log/Win Wall, Resources, Settings |
| Phase 5 | GitHub/Vercel sync, Slack bot, Claude AI features |
