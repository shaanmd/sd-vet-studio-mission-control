# Mission Control Phase 4: Integrations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Mission Control to GitHub, Vercel, and Slack for automatic status updates, notifications, and slash command input.

**Architecture:** All integrations run as Supabase Edge Functions (Deno). GitHub/Vercel sync runs on a cron schedule (hourly). Slack interactions handled via edge function endpoints. API tokens stored in Supabase secrets.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), GitHub REST API, Vercel REST API, Slack API

**Spec:** `docs/superpowers/specs/2026-03-26-mission-control-redesign-design.md`
**Depends on:** Phase 3 (Supporting Pages) completed

---

### Task 1: GitHub & Vercel Sync Edge Function

**Files:**
- Create: `supabase/functions/sync-status/index.ts`

- [ ] **Step 1: Create the sync-status edge function**

Create `supabase/functions/sync-status/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const githubToken = Deno.env.get('GITHUB_TOKEN')
  const vercelToken = Deno.env.get('VERCEL_TOKEN')

  // Get all projects with github_repo or vercel_project_id
  const { data: projects } = await supabase
    .from('projects')
    .select('id, github_repo, vercel_project_id')
    .or('github_repo.not.is.null,vercel_project_id.not.is.null')

  const results: string[] = []

  for (const project of projects ?? []) {
    const cacheUpdate: Record<string, unknown> = {
      project_id: project.id,
      updated_at: new Date().toISOString(),
    }

    // GitHub: fetch latest commit and open PRs
    if (project.github_repo && githubToken) {
      try {
        // Latest commit
        const commitsRes = await fetch(
          `https://api.github.com/repos/${project.github_repo}/commits?per_page=1`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
        )
        if (commitsRes.ok) {
          const [commit] = await commitsRes.json()
          if (commit) {
            cacheUpdate.last_commit_message = commit.commit?.message?.split('\n')[0] ?? null
            cacheUpdate.last_commit_author = commit.commit?.author?.name ?? null
            cacheUpdate.last_commit_at = commit.commit?.author?.date ?? null
          }
        }

        // Open PRs
        const prsRes = await fetch(
          `https://api.github.com/repos/${project.github_repo}/pulls?state=open&per_page=100`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
        )
        if (prsRes.ok) {
          const prs = await prsRes.json()
          cacheUpdate.open_prs = Array.isArray(prs) ? prs.length : 0
        }
      } catch (e) {
        results.push(`GitHub error for ${project.github_repo}: ${e}`)
      }
    }

    // Vercel: fetch latest deployment
    if (project.vercel_project_id && vercelToken) {
      try {
        const deployRes = await fetch(
          `https://api.vercel.com/v6/deployments?projectId=${project.vercel_project_id}&limit=1`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        )
        if (deployRes.ok) {
          const { deployments } = await deployRes.json()
          if (deployments?.[0]) {
            const d = deployments[0]
            cacheUpdate.deploy_status = d.state === 'READY' ? 'ready' : d.state === 'ERROR' ? 'error' : 'building'
            cacheUpdate.deploy_url = d.url ? `https://${d.url}` : null
          }
        }
      } catch (e) {
        results.push(`Vercel error for ${project.vercel_project_id}: ${e}`)
      }
    }

    // Upsert cache
    await supabase
      .from('github_cache')
      .upsert(cacheUpdate, { onConflict: 'project_id' })

    results.push(`Synced: ${project.github_repo ?? project.vercel_project_id}`)
  }

  return new Response(JSON.stringify({ synced: results.length, details: results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Set Supabase secrets**

In Supabase Dashboard → Settings → Edge Functions → Secrets, add:
- `GITHUB_TOKEN`: GitHub personal access token (Settings → Developer settings → Personal access tokens → Fine-grained tokens with repo read access)
- `VERCEL_TOKEN`: Vercel API token (Settings → Tokens)

- [ ] **Step 3: Deploy the edge function**

```bash
npx supabase functions deploy sync-status --project-ref <your-project-ref>
```

Or deploy via Supabase Dashboard if using the web UI.

- [ ] **Step 4: Set up hourly cron via Supabase**

In Supabase Dashboard → Database → Extensions → enable `pg_cron`.

Then in SQL Editor:
```sql
SELECT cron.schedule(
  'sync-github-vercel',
  '0 * * * *',  -- every hour
  $$SELECT net.http_post(
    url := '<your-supabase-url>/functions/v1/sync-status',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-service-role-key>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );$$
);
```

- [ ] **Step 5: Test the sync manually**

```bash
curl -X POST '<your-supabase-url>/functions/v1/sync-status' \
  -H 'Authorization: Bearer <your-service-role-key>'
```

Expected: JSON response with synced project count.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add GitHub/Vercel sync edge function with hourly cron"
```

---

### Task 2: Slack Bot — Slash Commands

**Files:**
- Create: `supabase/functions/slack-commands/index.ts`

- [ ] **Step 1: Create a Slack App**

Go to https://api.slack.com/apps → Create New App → From Scratch.
- App Name: "Mission Control"
- Workspace: Your workspace

Under OAuth & Permissions, add Bot Token Scopes:
- `chat:write`
- `commands`

Install to workspace. Copy the Bot User OAuth Token.

Add Supabase secret: `SLACK_BOT_TOKEN`
Add Supabase secret: `SLACK_SIGNING_SECRET` (from Basic Information page)

- [ ] **Step 2: Create the slash command edge function**

Create `supabase/functions/slack-commands/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const formData = await req.formData()
  const command = formData.get('command') as string
  const text = (formData.get('text') as string || '').trim()
  const userId = formData.get('user_id') as string

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Find the profile by slack_user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('slack_user_id', userId)
    .single()

  if (!profile) {
    return new Response(JSON.stringify({
      response_type: 'ephemeral',
      text: '❌ Your Slack account is not linked to Mission Control. Update your profile in Settings.',
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Parse subcommand
  const parts = text.match(/^(\w+)\s+(.+)$/)
  if (!parts) {
    return new Response(JSON.stringify({
      response_type: 'ephemeral',
      text: 'Usage:\n`/mc add "Project idea"` — Add to inbox\n`/mc next ProjectName "Next step"` — Set next step\n`/mc done "Task title"` — Complete a task\n`/mc lead ProjectName "Name, Clinic - context"` — Add a lead',
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  const subcommand = parts[1].toLowerCase()
  const args = parts[2]

  try {
    if (subcommand === 'add') {
      // Create inbox project
      const name = args.replace(/^["']|["']$/g, '')
      await supabase.from('projects').insert({
        name,
        stage: 'inbox',
        created_by: profile.id,
        updated_by: profile.id,
      })
      return respond(`✅ Added "${name}" to Inbox`)
    }

    if (subcommand === 'done') {
      // Find and complete task
      const taskTitle = args.replace(/^["']|["']$/g, '')
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, project_id')
        .ilike('title', `%${taskTitle}%`)
        .eq('completed', false)
        .limit(1)

      if (!tasks?.length) {
        return respond(`❌ No matching active task found for "${taskTitle}"`)
      }

      await supabase.from('tasks').update({
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: profile.id,
      }).eq('id', tasks[0].id)

      return respond(`✅ Completed: "${tasks[0].title}" 🎉`)
    }

    if (subcommand === 'next') {
      // Parse: next ProjectName "task title"
      const nextMatch = args.match(/^(\S+)\s+["']?(.+?)["']?$/)
      if (!nextMatch) return respond('Usage: `/mc next ProjectName "Next step title"`')

      const projectSearch = nextMatch[1]
      const taskTitle = nextMatch[2]

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', `%${projectSearch}%`)
        .limit(1)

      if (!projects?.length) return respond(`❌ No project matching "${projectSearch}"`)

      // Clear old next step, create new task as next step
      await supabase.from('tasks').update({ is_next_step: false }).eq('project_id', projects[0].id).eq('is_next_step', true)
      await supabase.from('tasks').insert({
        project_id: projects[0].id,
        title: taskTitle,
        is_next_step: true,
        assigned_to: profile.id,
      })

      return respond(`✅ Next step for ${projects[0].name}: "${taskTitle}"`)
    }

    if (subcommand === 'lead') {
      const leadMatch = args.match(/^(\S+)\s+["']?(.+?)["']?$/)
      if (!leadMatch) return respond('Usage: `/mc lead ProjectName "Name, Clinic - context"`')

      const projectSearch = leadMatch[1]
      const leadText = leadMatch[2]

      const { data: projects } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', `%${projectSearch}%`)
        .limit(1)

      if (!projects?.length) return respond(`❌ No project matching "${projectSearch}"`)

      // Simple parse: split on comma or dash
      const namePart = leadText.split(/[,\-–]/)[0]?.trim() ?? leadText
      const rest = leadText.slice(namePart.length).replace(/^[,\-–\s]+/, '').trim()

      await supabase.from('leads').insert({
        project_id: projects[0].id,
        name: namePart,
        role_clinic: rest || null,
        source: 'Slack',
        added_by: profile.id,
      })

      return respond(`✅ Lead added to ${projects[0].name}: ${namePart}`)
    }

    return respond(`❌ Unknown command: ${subcommand}. Try: add, done, next, lead`)
  } catch (e) {
    return respond(`❌ Error: ${e}`)
  }
})

function respond(text: string) {
  return new Response(JSON.stringify({
    response_type: 'ephemeral',
    text,
  }), { headers: { 'Content-Type': 'application/json' } })
}
```

- [ ] **Step 3: Deploy and configure Slack slash command**

Deploy the function:
```bash
npx supabase functions deploy slack-commands --project-ref <your-project-ref>
```

In Slack App settings → Slash Commands → Create New Command:
- Command: `/mc`
- Request URL: `<your-supabase-url>/functions/v1/slack-commands`
- Description: "Mission Control commands"
- Usage Hint: `add|done|next|lead [args]`

- [ ] **Step 4: Link Slack user IDs to profiles**

In Supabase SQL Editor, update profiles with Slack user IDs (find these in Slack → click profile → More → Copy member ID):
```sql
UPDATE profiles SET slack_user_id = '<deb-slack-id>' WHERE name = 'Deb';
UPDATE profiles SET slack_user_id = '<shaan-slack-id>' WHERE name = 'Shaan';
```

- [ ] **Step 5: Test slash commands**

In Slack, type:
- `/mc add "Test idea from Slack"`
- `/mc done "Test task"`
Expected: Confirmation messages appear.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/slack-commands/
git commit -m "feat: add Slack slash commands for add, done, next, lead"
```

---

### Task 3: Slack Daily Digest

**Files:**
- Create: `supabase/functions/daily-digest/index.ts`

- [ ] **Step 1: Create the daily digest edge function**

Create `supabase/functions/daily-digest/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const slackToken = Deno.env.get('SLACK_BOT_TOKEN')!

  // Get profiles with slack IDs
  const { data: profiles } = await supabase.from('profiles').select('*').not('slack_user_id', 'is', null)

  // Get pinned projects
  const { data: pinnedProjects } = await supabase
    .from('projects')
    .select('id, name, emoji, tasks!tasks_project_id_fkey(id, title, is_next_step, completed)')
    .eq('pinned', true)

  for (const profile of profiles ?? []) {
    // Get personal tasks
    const { data: personalTasks } = await supabase
      .from('personal_tasks')
      .select('title, project:projects(name, emoji)')
      .eq('owner_id', profile.id)
      .eq('completed', false)
      .order('sort_order')
      .limit(3)

    // Build message
    const blocks: unknown[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `☀️ Good morning, ${profile.name}!` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Your Next 3:*',
        },
      },
    ]

    if (personalTasks?.length) {
      const taskLines = personalTasks.map((t: { title: string; project: { name: string; emoji: string } | null }, i: number) =>
        `${i + 1}. ${t.title}${t.project ? ` _(${t.project.emoji} ${t.project.name})_` : ''}`
      ).join('\n')
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: taskLines } })
    } else {
      blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '_No personal tasks set. Add some in Mission Control!_' } })
    }

    blocks.push({ type: 'divider' })
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: '*Focus Projects:*' } })

    for (const project of pinnedProjects ?? []) {
      const nextStep = project.tasks?.find((t: { is_next_step: boolean; completed: boolean }) => t.is_next_step && !t.completed)
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${project.emoji} *${project.name}*\n→ ${nextStep ? nextStep.title : '_No next step set_'}`,
        },
      })
    }

    // Send DM via Slack
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: profile.slack_user_id,
        blocks,
        text: `Good morning, ${profile.name}! Here's your Mission Control digest.`,
      }),
    })
  }

  return new Response(JSON.stringify({ sent: profiles?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy and set up morning cron**

Deploy:
```bash
npx supabase functions deploy daily-digest --project-ref <your-project-ref>
```

Set up cron (adjust time for NZ timezone — 7am NZST = 7pm UTC previous day):
```sql
SELECT cron.schedule(
  'daily-digest',
  '0 19 * * *',  -- 7pm UTC = 7am NZST next day (adjust for daylight saving)
  $$SELECT net.http_post(
    url := '<your-supabase-url>/functions/v1/daily-digest',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-service-role-key>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );$$
);
```

- [ ] **Step 3: Test the digest**

```bash
curl -X POST '<your-supabase-url>/functions/v1/daily-digest' \
  -H 'Authorization: Bearer <your-service-role-key>'
```

Expected: Both Deb and Shaan receive a Slack DM with their tasks and focus projects.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/daily-digest/
git commit -m "feat: add Slack daily digest with morning cron"
```

---

### Task 4: Stale Project Nudges

**Files:**
- Create: `supabase/functions/stale-nudge/index.ts`

- [ ] **Step 1: Create the stale nudge edge function**

Create `supabase/functions/stale-nudge/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const slackToken = Deno.env.get('SLACK_BOT_TOKEN')!

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Find stale building/exploring projects
  const { data: staleProjects } = await supabase
    .from('projects')
    .select('id, name, emoji, updated_at')
    .in('stage', ['building', 'exploring'])
    .lt('updated_at', fourteenDaysAgo)

  if (!staleProjects?.length) {
    return new Response(JSON.stringify({ stale: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  // Get all profiles with slack IDs
  const { data: profiles } = await supabase.from('profiles').select('slack_user_id').not('slack_user_id', 'is', null)

  const projectList = staleProjects.map((p) =>
    `${p.emoji} *${p.name}* — last updated ${Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000)} days ago`
  ).join('\n')

  const message = `🔔 *Stale Project Check*\n\nThese projects haven't been touched in 14+ days:\n\n${projectList}\n\n_Still working on them, or move to Someday/Maybe?_`

  // Send to all team members
  for (const profile of profiles ?? []) {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: profile.slack_user_id,
        text: message,
      }),
    })
  }

  return new Response(JSON.stringify({ stale: staleProjects.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy and schedule daily check**

```bash
npx supabase functions deploy stale-nudge --project-ref <your-project-ref>
```

```sql
SELECT cron.schedule(
  'stale-nudge',
  '0 20 * * *',  -- daily at 8pm UTC (8am NZST)
  $$SELECT net.http_post(
    url := '<your-supabase-url>/functions/v1/stale-nudge',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-service-role-key>',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );$$
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/stale-nudge/
git commit -m "feat: add stale project nudge with daily Slack notifications"
```

---

### Task 5: Update Settings Page with Integration Config

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Update Settings to show integration status**

Update the Integrations section in `app/settings/page.tsx` to show connected status based on whether `github_cache` has data and whether `slack_user_id` is set on the profile. Replace the "Phase 4" badges with green "Connected" or orange "Not connected" indicators.

- [ ] **Step 2: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: show integration connection status in Settings"
```

---

## Phase 4 Complete Checklist

- [ ] GitHub/Vercel sync edge function with hourly cron
- [ ] Slack slash commands (/mc add, done, next, lead)
- [ ] Slack daily morning digest
- [ ] Stale project nudge notifications
- [ ] Settings page shows integration status
- [ ] All edge functions deployed and tested

**Next phase:** Phase 5 — AI Features (Claude API)
