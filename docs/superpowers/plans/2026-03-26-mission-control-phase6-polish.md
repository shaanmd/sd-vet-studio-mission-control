# Mission Control Phase 6: Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA support for mobile installation, build the Weekly Review guided flow page, add Saturday Slack reminder, and create a first-run onboarding experience.

**Architecture:** PWA via @serwist/next for service worker and manifest. Weekly Review page calls the AI helper edge function for auto-prep data. First-run detection checks project count on the home page.

**Tech Stack:** Next.js 15, @serwist/next, Tailwind CSS 4, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-26-mission-control-redesign-design.md`
**Depends on:** Phase 5 (AI Features) completed

---

### Task 1: PWA Setup

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`
- Create: `public/manifest.json`
- Create: `app/sw.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install @serwist/next**

```bash
npm install @serwist/next @serwist/sw
```

- [ ] **Step 2: Create the web app manifest**

Create `public/manifest.json`:
```json
{
  "name": "SD VetStudio Mission Control",
  "short_name": "Mission Control",
  "description": "Project management second brain for SD VetStudio",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F0E8",
  "theme_color": "#1E6B5E",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Note: You'll need to create `icon-192.png` and `icon-512.png` in `/public/` — use a paw print icon in teal (#1E6B5E) on cream (#F5F0E8) background.

- [ ] **Step 3: Create the service worker**

Create `app/sw.ts`:
```typescript
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

- [ ] **Step 4: Update Next.js config for PWA**

Replace `next.config.ts`:
```typescript
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
})

export default withSerwist({
  // your existing next config
})
```

- [ ] **Step 5: Add manifest link to layout**

In `app/layout.tsx`, add to the `<html>` head via metadata:
```tsx
export const metadata: Metadata = {
  title: 'SD VetStudio Mission Control',
  description: 'Project management second brain for SD VetStudio',
  manifest: '/manifest.json',
  themeColor: '#1E6B5E',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Mission Control',
  },
}
```

- [ ] **Step 6: Add .superpowers to .gitignore**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 7: Verify PWA works**

Run: `npm run build && npm run start`
Open Chrome DevTools → Application → Manifest: should show app info.
On mobile: "Add to Home Screen" should be available.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.ts public/manifest.json app/sw.ts app/layout.tsx .gitignore
git commit -m "feat: add PWA support for mobile installation"
```

---

### Task 2: Weekly Review Page

**Files:**
- Create: `app/review/page.tsx`
- Create: `components/review/ReviewFlow.tsx`

- [ ] **Step 1: Create the ReviewFlow component**

Create `components/review/ReviewFlow.tsx`:
```tsx
'use client'

import { useState, useEffect } from 'react'
import { getWeeklyReview } from '@/lib/ai'
import Link from 'next/link'

interface ReviewData {
  summary: string
  focus_project_reviews: { name: string; what_happened: string; suggested_next_step: string }[]
  stale_projects: string[]
  inbox_count: number
  wins: string[]
  suggested_focus_next_week: string
}

export function ReviewFlow() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const result = await getWeeklyReview()
        setData(result)
      } catch (e) {
        setError(String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
        <div className="text-2xl mb-3 animate-pulse">🧠</div>
        <p className="text-sm text-[#8899a6]">AI is preparing your Sunday review...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
        <p className="text-sm text-red-500">Failed to load review. {error}</p>
      </div>
    )
  }

  const steps = [
    // Step 0: Summary
    <div key="summary" className="space-y-4">
      <div className="bg-white rounded-xl border border-black/8 p-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#D4A853] font-semibold mb-2">This Week</div>
        <p className="text-sm text-[#2C3E50] leading-relaxed">{data.summary}</p>
      </div>
    </div>,

    // Step 1: Focus project reviews
    <div key="projects" className="space-y-3">
      <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">Focus Project Reviews</div>
      {data.focus_project_reviews.map((project, i) => (
        <div key={i} className="bg-white rounded-xl border border-black/8 p-4">
          <h3 className="font-semibold text-[#2C3E50] mb-2">{project.name}</h3>
          <div className="text-sm text-[#4a5568] mb-2">{project.what_happened}</div>
          <div className="bg-[#D4A853]/8 rounded-lg p-2.5 flex items-start gap-2">
            <span className="text-[#D4A853]">→</span>
            <div className="text-[13px] text-[#b45309]">
              <strong>Suggested next:</strong> {project.suggested_next_step}
            </div>
          </div>
        </div>
      ))}
    </div>,

    // Step 2: Stale + Inbox
    <div key="stale" className="space-y-4">
      {data.stale_projects.length > 0 && (
        <div className="bg-white rounded-xl border border-[#b45309]/20 p-4">
          <div className="text-[11px] uppercase tracking-[2px] text-[#b45309] font-semibold mb-2">Stale Projects</div>
          <ul className="text-sm text-[#2C3E50] space-y-1">
            {data.stale_projects.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
          <p className="text-xs text-[#8899a6] mt-2 italic">Keep building, or move to Someday/Maybe?</p>
        </div>
      )}
      {data.inbox_count > 0 && (
        <div className="bg-white rounded-xl border border-black/8 p-4">
          <div className="text-[11px] uppercase tracking-[2px] text-[#b45309] font-semibold mb-2">Inbox</div>
          <p className="text-sm text-[#2C3E50]">You have <strong>{data.inbox_count}</strong> unsorted ideas.</p>
          <Link href="/projects" className="text-xs text-[#1E6B5E] hover:underline mt-1 block">
            Quick sort now →
          </Link>
        </div>
      )}
    </div>,

    // Step 3: Wins + Focus
    <div key="wins" className="space-y-4">
      <div className="bg-white rounded-xl border border-[#D4A853]/20 p-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#D4A853] font-semibold mb-2">
          This Week's Wins 🎉
        </div>
        {data.wins.length > 0 ? (
          <ul className="text-sm text-[#2C3E50] space-y-1">
            {data.wins.map((w, i) => <li key={i}>🎉 {w}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-[#8899a6]">No wins recorded this week. That's OK — some weeks are about planning.</p>
        )}
      </div>
      <div className="bg-white rounded-xl border border-black/8 p-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2">
          Suggested Focus for Next Week
        </div>
        <p className="text-sm text-[#2C3E50]">{data.suggested_focus_next_week}</p>
      </div>
    </div>,
  ]

  const stepLabels = ['Summary', 'Projects', 'Triage', 'Wins']

  return (
    <div>
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {stepLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
              step === i ? 'bg-[#1E6B5E] text-white' : step > i ? 'bg-[#1E6B5E]/20 text-[#1E6B5E]' : 'bg-[#F5F0E8] text-[#8899a6]'
            }`}
          >
            {step > i ? '✓' : i + 1} {label}
          </button>
        ))}
      </div>

      {steps[step]}

      {/* Navigation */}
      <div className="flex gap-2 mt-6">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="px-4 py-2.5 rounded-lg border border-black/10 text-sm text-[#8899a6]"
          >
            ← Back
          </button>
        )}
        <div className="flex-1" />
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="px-4 py-2.5 rounded-lg bg-[#1E6B5E] text-white text-sm font-semibold"
          >
            Next →
          </button>
        ) : (
          <Link
            href="/"
            className="px-4 py-2.5 rounded-lg bg-[#D4A853] text-white text-sm font-semibold"
          >
            Done — Back to Home 🎉
          </Link>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create the Review page**

Create `app/review/page.tsx`:
```tsx
import { ReviewFlow } from '@/components/review/ReviewFlow'

export default function ReviewPage() {
  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#2C3E50]">Sunday Review</h1>
        <p className="text-sm text-[#8899a6] mt-0.5">AI-prepared agenda for your weekly meeting</p>
      </div>
      <ReviewFlow />
    </div>
  )
}
```

- [ ] **Step 3: Add Review link to home page or nav**

Add a "Sunday Review" button to the QuickActions on the home page, or add it as a conditional banner when it's Saturday/Sunday:

In `components/home/QuickActions.tsx`, add a fourth action button:
```tsx
<Link
  href="/review"
  className="flex-1 bg-white border border-black/8 rounded-xl p-3 text-center text-[11px] text-[#8899a6] hover:border-[#D4A853]/30 transition-colors"
>
  <div className="text-lg mb-1">📋</div>
  Review
</Link>
```

- [ ] **Step 4: Commit**

```bash
git add app/review/ components/review/ components/home/QuickActions.tsx
git commit -m "feat: build Weekly Review page with AI-generated guided flow"
```

---

### Task 3: Saturday Slack Reminder

**Files:**
- Create: `supabase/functions/saturday-reminder/index.ts`

- [ ] **Step 1: Create the Saturday reminder edge function**

Create `supabase/functions/saturday-reminder/index.ts`:
```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const slackToken = Deno.env.get('SLACK_BOT_TOKEN')!

  const { data: profiles } = await supabase
    .from('profiles')
    .select('name, slack_user_id')
    .not('slack_user_id', 'is', null)

  const appUrl = Deno.env.get('APP_URL') ?? 'https://your-app.vercel.app'

  for (const profile of profiles ?? []) {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${slackToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: profile.slack_user_id,
        text: `📋 Hey ${profile.name}! Your *Sunday Review* is ready.\n\nAI has prepped your meeting agenda — tap to review:\n${appUrl}/review\n\nSee you tomorrow! 🐾`,
      }),
    })
  }

  return new Response(JSON.stringify({ sent: profiles?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy and schedule**

```bash
npx supabase functions deploy saturday-reminder --project-ref <your-project-ref>
```

```sql
SELECT cron.schedule(
  'saturday-reminder',
  '0 5 * * 6',  -- 5pm UTC Saturday = 5am NZST Sunday (adjust for your timezone)
  $$SELECT net.http_post(
    url := '<your-supabase-url>/functions/v1/saturday-reminder',
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
git add supabase/functions/saturday-reminder/
git commit -m "feat: add Saturday evening Slack reminder for Sunday review"
```

---

### Task 4: First-Run Onboarding

**Files:**
- Modify: `app/page.tsx`
- Create: `components/home/FirstRunWelcome.tsx`

- [ ] **Step 1: Create the FirstRunWelcome component**

Create `components/home/FirstRunWelcome.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { createProject } from '@/lib/mutations/projects'
import { useRouter } from 'next/navigation'

export function FirstRunWelcome() {
  const [bulkNames, setBulkNames] = useState('')
  const [importing, setImporting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  async function handleBulkImport() {
    if (!bulkNames.trim() || !user) return
    setImporting(true)
    const names = bulkNames.split('\n').map((n) => n.trim()).filter(Boolean)
    for (const name of names) {
      await createProject({ name, created_by: user.id })
    }
    setImporting(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-6 text-center mb-6">
      <div className="text-4xl mb-3">🐾</div>
      <h2 className="text-lg font-semibold text-[#2C3E50] mb-2">
        Welcome to Mission Control!
      </h2>
      <p className="text-sm text-[#8899a6] mb-6">
        Start by adding your projects. You can paste a list of names below to bulk-add them to your Inbox.
      </p>

      <textarea
        value={bulkNames}
        onChange={(e) => setBulkNames(e.target.value)}
        placeholder={"6WSD Course Platform\nSynAIpseVet\nVetRoute\nJetpackersAI\n..."}
        className="w-full px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E] resize-none mb-3"
        rows={6}
      />

      <button
        onClick={handleBulkImport}
        disabled={importing || !bulkNames.trim()}
        className="w-full py-2.5 rounded-lg bg-[#1E6B5E] text-white font-semibold text-sm disabled:opacity-50"
      >
        {importing ? 'Importing...' : 'Add All to Inbox'}
      </button>

      <p className="text-xs text-[#8899a6] mt-3">
        One project name per line. They'll go into your Inbox for sorting later.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Add first-run detection to Home page**

In `app/page.tsx`, check if there are zero projects. If so, show `<FirstRunWelcome />` instead of the normal home screen:

```tsx
import { FirstRunWelcome } from '@/components/home/FirstRunWelcome'

// In the component, after fetching data:
const isFirstRun = pinnedProjects.length === 0 && debTasks.length === 0 && shaanTasks.length === 0

// In the JSX:
{isFirstRun ? <FirstRunWelcome /> : (
  <>
    <YourNext3 ... />
    <FocusProjects ... />
    <QuickActions />
  </>
)}
```

- [ ] **Step 3: Verify first-run experience**

Clear all projects from the database. Load the app.
Expected: Welcome screen with bulk import option.
Add some projects → screen switches to normal home view.

- [ ] **Step 4: Commit**

```bash
git add components/home/FirstRunWelcome.tsx app/page.tsx
git commit -m "feat: add first-run onboarding with bulk project import"
```

---

### Task 5: Final Polish and Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 2: Test all routes work**

Manually verify each page loads:
- `/` (Home)
- `/projects` (All Projects)
- `/projects/[id]` (Project Detail)
- `/log` (Activity Log + Win Wall)
- `/resources` (Resources)
- `/settings` (Settings)
- `/review` (Weekly Review)
- `/login` (Login)

- [ ] **Step 3: Test mobile responsiveness**

Open Chrome DevTools → Toggle device toolbar → Test on iPhone 12 size.
Verify bottom nav appears, sidebar hidden, all pages usable.

- [ ] **Step 4: Deploy to Vercel**

```bash
git push origin master
```

Vercel auto-deploys from master.

- [ ] **Step 5: Install PWA on phone**

Open the deployed URL on your phone → "Add to Home Screen".
Verify the app icon appears and opens in standalone mode.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final polish and build verification"
```

---

## Phase 6 Complete Checklist

- [ ] PWA installable on mobile with offline caching
- [ ] Weekly Review page with AI-generated guided flow
- [ ] Saturday Slack reminder for Sunday meeting
- [ ] First-run onboarding with bulk project import
- [ ] All pages verified on mobile and desktop
- [ ] Deployed to Vercel
- [ ] PWA installed and tested on phone

---

## Full Project Complete 🎉

All 6 phases deliver:
1. **Foundation** — Supabase, auth, layout, database
2. **Core Pages** — Home, All Projects, Project Detail
3. **Supporting Pages** — Resources, Activity Log, Win Wall, Leads, Settings
4. **Integrations** — GitHub/Vercel sync, Slack bot + digest + nudges
5. **AI Features** — Smart add, energy tags, next step suggestions, natural language, weekly review
6. **Polish** — PWA, onboarding, weekly review flow, Saturday reminders
