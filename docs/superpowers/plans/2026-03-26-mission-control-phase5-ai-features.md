# Mission Control Phase 5: AI Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Claude AI-powered features: Smart Quick Add (duplicate detection + cleanup), Next Step Suggestions, Auto Energy Tagging, Natural Language Slack, and Win Wall Monthly Summary.

**Architecture:** AI calls happen via Supabase Edge Functions using the Anthropic SDK. Frontend calls edge functions via fetch. Slack natural language processing goes through an edge function that calls Claude then updates the database.

**Tech Stack:** Anthropic Claude API (claude-sonnet-4-6), Supabase Edge Functions (Deno), @anthropic-ai/sdk

**Spec:** `docs/superpowers/specs/2026-03-26-mission-control-redesign-design.md`
**Depends on:** Phase 4 (Integrations) completed

---

### Task 1: AI Helper Edge Function

**Files:**
- Create: `supabase/functions/ai-helper/index.ts`

This is a single edge function that handles multiple AI operations via an `action` parameter.

- [ ] **Step 1: Add Supabase secret for Anthropic API key**

In Supabase Dashboard → Settings → Edge Functions → Secrets:
- `ANTHROPIC_API_KEY`: Your Anthropic API key

- [ ] **Step 2: Create the AI helper edge function**

Create `supabase/functions/ai-helper/index.ts`:
```typescript
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.39.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { action, ...params } = await req.json()

  try {
    let result: unknown

    switch (action) {
      case 'smart-quick-add':
        result = await smartQuickAdd(anthropic, supabase, params)
        break
      case 'suggest-next-step':
        result = await suggestNextStep(anthropic, supabase, params)
        break
      case 'auto-energy-tag':
        result = await autoEnergyTag(anthropic, params)
        break
      case 'natural-language':
        result = await naturalLanguage(anthropic, supabase, params)
        break
      case 'monthly-summary':
        result = await monthlySummary(anthropic, supabase, params)
        break
      case 'weekly-review':
        result = await weeklyReview(anthropic, supabase)
        break
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function smartQuickAdd(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createClient>,
  params: { raw_text: string }
) {
  // Get existing project names for duplicate detection
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, summary')

  const projectList = (projects ?? [])
    .map((p: { name: string; summary: string | null }) => `- ${p.name}${p.summary ? `: ${p.summary}` : ''}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You help organise project ideas for a veterinary tech studio. Given a rough idea, clean it up.

Existing projects:
${projectList}

Raw idea: "${params.raw_text}"

Respond in JSON only:
{
  "name": "Clean project name (short, title case)",
  "summary": "One-sentence description",
  "similar_project": "Name of existing project this is similar to, or null",
  "emoji": "One relevant emoji"
}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text)
}

async function suggestNextStep(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createClient>,
  params: { project_id: string }
) {
  const { data: project } = await supabase
    .from('projects')
    .select('name, summary')
    .eq('id', params.project_id)
    .single()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, completed')
    .eq('project_id', params.project_id)

  const { data: notes } = await supabase
    .from('project_notes')
    .select('content')
    .eq('project_id', params.project_id)
    .order('created_at', { ascending: false })
    .limit(5)

  const remaining = (tasks ?? []).filter((t: { completed: boolean }) => !t.completed).map((t: { title: string }) => t.title)
  const completed = (tasks ?? []).filter((t: { completed: boolean }) => t.completed).map((t: { title: string }) => t.title)
  const recentNotes = (notes ?? []).map((n: { content: string }) => n.content)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `Project: ${project?.name}
Summary: ${project?.summary ?? 'No summary'}
Completed tasks: ${completed.join(', ') || 'None'}
Remaining tasks: ${remaining.join(', ') || 'None'}
Recent notes: ${recentNotes.join(' | ') || 'None'}

Suggest ONE concrete next step to move this project forward. Keep it actionable and specific (under 80 chars). Respond with just the task title, nothing else.`
    }],
  })

  const suggestion = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  return { suggestion }
}

async function autoEnergyTag(
  anthropic: Anthropic,
  params: { task_title: string; project_name?: string }
) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 10,
    messages: [{
      role: 'user',
      content: `Classify this task's energy level as "high" (deep focus, coding, writing), "medium" (review, light research, emails), or "low" (admin, links, quick updates).

Task: "${params.task_title}"${params.project_name ? ` (Project: ${params.project_name})` : ''}

Respond with only one word: high, medium, or low.`
    }],
  })

  const energy = response.content[0].type === 'text' ? response.content[0].text.trim().toLowerCase() : 'medium'
  const valid = ['high', 'medium', 'low']
  return { energy: valid.includes(energy) ? energy : 'medium' }
}

async function naturalLanguage(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createClient>,
  params: { text: string; user_id: string }
) {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')

  const projectNames = (projects ?? []).map((p: { id: string; name: string }) => `${p.name} (${p.id})`).join(', ')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Parse this natural language update from a team member into structured actions.

Available projects: ${projectNames}

Message: "${params.text}"

Respond in JSON only:
{
  "actions": [
    {
      "type": "complete_task" | "add_note" | "set_next_step" | "add_idea",
      "project_id": "uuid or null",
      "project_name": "matched project name or null",
      "content": "task title, note text, or idea name"
    }
  ],
  "summary": "One-line human-readable summary of what was done"
}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const parsed = JSON.parse(text)

  // Execute actions
  for (const action of parsed.actions ?? []) {
    if (action.type === 'add_note' && action.project_id) {
      await supabase.from('project_notes').insert({
        project_id: action.project_id,
        author_id: params.user_id,
        content: action.content,
        note_type: 'note',
      })
    }
    if (action.type === 'complete_task' && action.project_id) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', action.project_id)
        .ilike('title', `%${action.content}%`)
        .eq('completed', false)
        .limit(1)
      if (tasks?.length) {
        await supabase.from('tasks').update({
          completed: true, completed_at: new Date().toISOString(), completed_by: params.user_id,
        }).eq('id', tasks[0].id)
      }
    }
    if (action.type === 'set_next_step' && action.project_id) {
      await supabase.from('tasks').update({ is_next_step: false }).eq('project_id', action.project_id).eq('is_next_step', true)
      await supabase.from('tasks').insert({
        project_id: action.project_id, title: action.content, is_next_step: true, assigned_to: params.user_id,
      })
    }
    if (action.type === 'add_idea') {
      await supabase.from('projects').insert({
        name: action.content, stage: 'inbox', created_by: params.user_id, updated_by: params.user_id,
      })
    }
  }

  return parsed
}

async function monthlySummary(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createClient>,
  params: { month?: number; year?: number }
) {
  const now = new Date()
  const month = params.month ?? now.getMonth()
  const year = params.year ?? now.getFullYear()
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 1).toISOString()

  const { data: wins } = await supabase
    .from('activity_log')
    .select('description, action, created_at, project:projects(name, emoji)')
    .eq('is_win', true)
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .order('created_at')

  if (!wins?.length) return { summary: 'No wins recorded this month yet. Get building!' }

  const winList = wins.map((w: { description: string; project: { emoji: string; name: string } | null }) =>
    `- ${w.description}${w.project ? ` (${w.project.emoji} ${w.project.name})` : ''}`
  ).join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Write an encouraging monthly summary for a small team of two vet-tech entrepreneurs (Deb and Shaan). Be warm, specific, and celebratory. Keep it under 150 words.

Wins this month:
${winList}

Total wins: ${wins.length}`
    }],
  })

  const summary = response.content[0].type === 'text' ? response.content[0].text : ''
  return { summary, win_count: wins.length }
}

async function weeklyReview(
  anthropic: Anthropic,
  supabase: ReturnType<typeof createClient>
) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get week's activity
  const { data: activity } = await supabase
    .from('activity_log')
    .select('*, project:projects(name, emoji)')
    .gte('created_at', oneWeekAgo)
    .order('created_at')

  // Get pinned projects with tasks
  const { data: pinned } = await supabase
    .from('projects')
    .select('id, name, emoji, summary, tasks!tasks_project_id_fkey(title, completed, is_next_step, completed_at)')
    .eq('pinned', true)

  // Get stale projects
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: stale } = await supabase
    .from('projects')
    .select('name, emoji, updated_at')
    .in('stage', ['building', 'exploring'])
    .lt('updated_at', fourteenDaysAgo)

  // Get inbox count
  const { count: inboxCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('stage', 'inbox')

  const completedThisWeek = (activity ?? []).filter((a: { action: string }) => a.action === 'task_completed').length
  const deploys = (activity ?? []).filter((a: { action: string }) => a.action === 'deployed').length
  const newIdeas = (activity ?? []).filter((a: { action: string }) => a.action === 'project_created').length

  const context = `
This week: ${completedThisWeek} tasks completed, ${deploys} deploys, ${newIdeas} new ideas added.

Focus projects:
${(pinned ?? []).map((p: { emoji: string; name: string; tasks: { title: string; is_next_step: boolean; completed: boolean; completed_at: string | null }[] }) => {
    const weekTasks = p.tasks?.filter((t) => t.completed && t.completed_at && t.completed_at >= oneWeekAgo) ?? []
    const nextStep = p.tasks?.find((t) => t.is_next_step && !t.completed)
    return `${p.emoji} ${p.name}: ${weekTasks.length} tasks done this week. Next: ${nextStep?.title ?? 'none set'}`
  }).join('\n')}

Stale projects (14+ days inactive): ${(stale ?? []).map((s: { emoji: string; name: string }) => `${s.emoji} ${s.name}`).join(', ') || 'None'}

Unsorted inbox items: ${inboxCount ?? 0}
`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Generate a structured weekly review agenda for a Sunday meeting between Deb and Shaan (vet-tech entrepreneurs). Be concise and actionable.

${context}

Format as JSON:
{
  "summary": "One-paragraph overview of the week",
  "focus_project_reviews": [{"name": "...", "what_happened": "...", "suggested_next_step": "..."}],
  "stale_projects": ["project names that need attention"],
  "inbox_count": number,
  "wins": ["list of completed items to celebrate"],
  "suggested_focus_next_week": "brief suggestion"
}`
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  return JSON.parse(text)
}
```

- [ ] **Step 3: Deploy the AI helper**

```bash
npx supabase functions deploy ai-helper --project-ref <your-project-ref>
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ai-helper/
git commit -m "feat: add AI helper edge function with all Claude-powered features"
```

---

### Task 2: Integrate AI into Frontend

**Files:**
- Create: `lib/ai.ts`
- Modify: `components/home/QuickActions.tsx` (Smart Quick Add)
- Modify: `components/project-detail/TaskList.tsx` (energy tag + next step suggestion)

- [ ] **Step 1: Create AI client helper**

Create `lib/ai.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

async function callAI(action: string, params: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-helper`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...params }),
    }
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function smartQuickAdd(rawText: string) {
  return callAI('smart-quick-add', { raw_text: rawText })
}

export async function suggestNextStep(projectId: string) {
  return callAI('suggest-next-step', { project_id: projectId })
}

export async function autoEnergyTag(taskTitle: string, projectName?: string) {
  return callAI('auto-energy-tag', { task_title: taskTitle, project_name: projectName })
}

export async function getWeeklyReview() {
  return callAI('weekly-review', {})
}

export async function getMonthlySummary(month?: number, year?: number) {
  return callAI('monthly-summary', { month, year })
}
```

- [ ] **Step 2: Update QuickActions with Smart Quick Add**

In `components/home/QuickActions.tsx`, after creating the project, call `smartQuickAdd(ideaName)` and if it returns a `similar_project`, show a toast or banner with "This sounds similar to [project] — merge or keep separate?"

Update the project with the cleaned name, summary, and emoji from the AI response.

- [ ] **Step 3: Update TaskList with AI features**

In `components/project-detail/TaskList.tsx`:
- After a task is created, call `autoEnergyTag(title, projectName)` and update the task's energy level
- After a task is completed, call `suggestNextStep(projectId)` and show the suggestion as a banner the user can accept or dismiss

- [ ] **Step 4: Commit**

```bash
git add lib/ai.ts components/home/QuickActions.tsx components/project-detail/TaskList.tsx
git commit -m "feat: integrate AI features into frontend (smart add, energy tags, suggestions)"
```

---

### Task 3: Natural Language Slack Integration

**Files:**
- Modify: `supabase/functions/slack-commands/index.ts`

- [ ] **Step 1: Add natural language fallback to Slack command handler**

Update the slash command handler: if no subcommand matches, treat the entire text as a natural language message and call the AI helper's `natural-language` action. Return the summary as the Slack response.

Add this before the "Unknown command" response:
```typescript
// Fallback: natural language processing
const nlResult = await fetch(
  `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-helper`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'natural-language',
      text: text,
      user_id: profile.id,
    }),
  }
)
const nlData = await nlResult.json()
return respond(`✅ ${nlData.summary ?? 'Updated!'}`)
```

- [ ] **Step 2: Deploy updated function**

```bash
npx supabase functions deploy slack-commands --project-ref <your-project-ref>
```

- [ ] **Step 3: Test natural language in Slack**

Type in Slack: `/mc just finished the auth flow on 6WSD, next up is quiz component`
Expected: AI parses and updates the project, returns confirmation.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/slack-commands/
git commit -m "feat: add natural language processing fallback to Slack commands"
```

---

## Phase 5 Complete Checklist

- [ ] AI helper edge function deployed with all 6 AI features
- [ ] Smart Quick Add with duplicate detection in frontend
- [ ] Auto energy tagging on new tasks
- [ ] Next step suggestions after task completion
- [ ] Natural language Slack processing
- [ ] Weekly review AI auto-prep
- [ ] Monthly win summary generation
- [ ] All features tested end-to-end

**Next phase:** Phase 6 — Polish (PWA, Weekly Review page, first-run experience)
