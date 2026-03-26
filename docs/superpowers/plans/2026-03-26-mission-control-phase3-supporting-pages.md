# Mission Control Phase 3: Supporting Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Resources page, Activity Log + Win Wall, full Settings page, and Leads & Beta Testers section on Project Detail.

**Architecture:** Same pattern as Phase 2 — server components for data fetch, client components for interactivity. Resources page is mostly static links. Activity Log queries the `activity_log` table. Leads are a sub-section of the project detail page.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase

**Spec:** `docs/superpowers/specs/2026-03-26-mission-control-redesign-design.md`
**Depends on:** Phase 2 (Core Pages) completed

---

### Task 1: Resources Page

**Files:**
- Modify: `app/resources/page.tsx`
- Create: `components/resources/ResourceList.tsx`
- Create: `lib/queries/resources.ts`
- Create: `supabase/seed-resources.sql`

- [ ] **Step 1: Create resources query**

Create `lib/queries/resources.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { Resource, ResourceCategory } from '@/lib/types/database'

export async function getResources() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) throw error

  // Group by category
  const grouped: Record<ResourceCategory, Resource[]> = {
    dev: [], marketing: [], ai: [], business: [], brand: [], contacts: [],
  }
  for (const r of (data ?? []) as Resource[]) {
    grouped[r.category]?.push(r)
  }
  return grouped
}
```

- [ ] **Step 2: Create seed data for resources**

Create `supabase/seed-resources.sql`:
```sql
-- Seed shared resources (run in Supabase SQL Editor)
INSERT INTO resources (category, name, description, url, icon, sort_order) VALUES
-- Dev & Deployment
('dev', 'GitHub', 'Repos, PRs, issues', 'https://github.com', '⚙️', 1),
('dev', 'Vercel', 'Deployments, domains, analytics', 'https://vercel.com/dashboard', '▲', 2),
('dev', 'Supabase', 'Database, auth, storage', 'https://supabase.com/dashboard', '🟢', 3),
('dev', 'Google Play Console', 'App publishing & reviews', 'https://play.google.com/console', '▶️', 4),
-- Marketing & Content
('marketing', 'Canva', 'Brand assets, social, presentations', 'https://www.canva.com', '🎨', 1),
('marketing', 'YouTube', 'Channel, uploads, analytics', 'https://studio.youtube.com', '📹', 2),
('marketing', 'Social Accounts', 'Instagram, Facebook, LinkedIn', '#', '📱', 3),
-- AI Tools
('ai', 'Claude / Anthropic', 'AI assistant, API console', 'https://claude.ai', '🧠', 1),
('ai', 'ChatGPT / OpenAI', 'Custom GPTs, API', 'https://chat.openai.com', '💬', 2),
('ai', 'Lovable', 'Vibe-coded prototypes', 'https://lovable.dev', '💜', 3),
-- Business
('business', 'Finance App', 'Coming soon — not yet chosen', '#', '💰', 1),
('business', 'CRM', 'Coming soon — not yet chosen', '#', '👥', 2),
('business', 'Google Calendar', 'Shared team calendar', 'https://calendar.google.com', '📅', 3),
('business', 'Slack', 'Team chat & notifications', '#', '💬', 4),
-- Brand
('brand', 'Brand Kit', 'Colours, fonts, logos, guidelines', '#', '🎨', 1),
('brand', 'Photo Library', 'Team photos, product shots', '#', '📸', 2),
-- Contacts
('contacts', 'Francois du Plessis', 'Business Mentor', '#', '👤', 1),
('contacts', 'NZVA Contacts', 'Association leads', '#', '👥', 2),
('contacts', 'Deb', 'Veterinarian & Educator', '#', '🐾', 3),
('contacts', 'Shaan', 'Web Designer / Developer', '#', '💻', 4);
```

- [ ] **Step 3: Run the seed SQL in Supabase**

Go to Supabase SQL Editor → paste and run `supabase/seed-resources.sql`.

- [ ] **Step 4: Create ResourceList component**

Create `components/resources/ResourceList.tsx`:
```tsx
'use client'

import { useState } from 'react'
import type { Resource, ResourceCategory } from '@/lib/types/database'

interface ResourceListProps {
  grouped: Record<ResourceCategory, Resource[]>
}

const categoryInfo: Record<ResourceCategory, { label: string; }> = {
  dev: { label: 'Dev & Deployment' },
  marketing: { label: 'Marketing & Content' },
  ai: { label: 'AI Tools' },
  business: { label: 'Business' },
  brand: { label: 'Brand' },
  contacts: { label: 'Contacts' },
}

const categoryOrder: ResourceCategory[] = ['dev', 'marketing', 'ai', 'business', 'brand', 'contacts']

export function ResourceList({ grouped }: ResourceListProps) {
  const [search, setSearch] = useState('')

  const filteredGrouped = Object.fromEntries(
    categoryOrder.map((cat) => [
      cat,
      (grouped[cat] ?? []).filter((r) =>
        !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
      ),
    ])
  ) as Record<ResourceCategory, Resource[]>

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search resources..."
          className="w-full px-3 py-2.5 rounded-lg border border-black/10 bg-white text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]"
        />
      </div>

      <div className="space-y-4">
        {categoryOrder.map((cat) => {
          const resources = filteredGrouped[cat]
          if (resources.length === 0) return null
          const info = categoryInfo[cat]

          return (
            <div key={cat}>
              <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2">
                {info.label}
              </div>
              <div className="bg-white rounded-xl border border-black/8 overflow-hidden">
                {resources.map((resource, i) => (
                  <a
                    key={resource.id}
                    href={resource.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 px-3.5 py-3 hover:bg-[#F5F0E8] transition-colors ${
                      i < resources.length - 1 ? 'border-b border-black/5' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center text-base flex-shrink-0">
                      {resource.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#2C3E50]">{resource.name}</div>
                      {resource.description && (
                        <div className="text-[11px] text-[#8899a6]">{resource.description}</div>
                      )}
                    </div>
                    <span className="text-[#ccc] text-xs">↗</span>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Wire up the Resources page**

Replace `app/resources/page.tsx`:
```tsx
import { getResources } from '@/lib/queries/resources'
import { ResourceList } from '@/components/resources/ResourceList'

export default async function ResourcesPage() {
  const grouped = await getResources()

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2C3E50]">Resources</h1>
        <p className="text-sm text-[#8899a6] mt-0.5">Shared logins, tools & quick links</p>
      </div>
      <ResourceList grouped={grouped} />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/resources/ components/resources/ lib/queries/resources.ts supabase/seed-resources.sql
git commit -m "feat: build Resources page with categorised links and search"
```

---

### Task 2: Activity Log + Win Wall

**Files:**
- Modify: `app/log/page.tsx`
- Create: `components/log/ActivityFeed.tsx`
- Create: `components/log/WinWall.tsx`
- Create: `lib/queries/activity.ts`

- [ ] **Step 1: Create activity query functions**

Create `lib/queries/activity.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import type { ActivityLogWithDetails } from '@/lib/types/database'

export async function getActivityLog(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      project:projects(id, name, emoji),
      actor:profiles(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ActivityLogWithDetails[]
}

export async function getWins(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select(`
      *,
      project:projects(id, name, emoji),
      actor:profiles(id, name)
    `)
    .eq('is_win', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ActivityLogWithDetails[]
}
```

- [ ] **Step 2: Create ActivityFeed component**

Create `components/log/ActivityFeed.tsx`:
```tsx
import type { ActivityLogWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'
import Link from 'next/link'

interface ActivityFeedProps {
  entries: ActivityLogWithDetails[]
}

const actionIcons: Record<string, string> = {
  task_completed: '✅',
  note_added: '📝',
  stage_changed: '🔄',
  deployed: '🚀',
  project_created: '✨',
  project_pinned: '⭐',
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
        <p className="text-sm text-[#8899a6]">Nothing here yet — complete your first task and it'll show up here! 🎉</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-black/8 overflow-hidden">
      {entries.map((entry, i) => (
        <div key={entry.id} className={`flex items-start gap-2.5 px-3.5 py-3 ${i < entries.length - 1 ? 'border-b border-black/5' : ''}`}>
          <span className="text-base mt-0.5">{actionIcons[entry.action] ?? '📋'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[#2C3E50]">{entry.description}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8899a6]">
              {entry.project && (
                <Link href={`/projects/${entry.project.id}`} className="text-[#1E6B5E] hover:underline">
                  {entry.project.emoji} {entry.project.name}
                </Link>
              )}
              {entry.actor && <span>· {entry.actor.name}</span>}
              <span>· {formatDistanceToNow(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create WinWall component**

Create `components/log/WinWall.tsx`:
```tsx
import type { ActivityLogWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'
import Link from 'next/link'

interface WinWallProps {
  wins: ActivityLogWithDetails[]
}

export function WinWall({ wins }: WinWallProps) {
  if (wins.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-sm text-[#8899a6]">Your wins will appear here. Go ship something!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {wins.map((win) => (
        <div key={win.id} className="bg-white rounded-xl border border-[#D4A853]/20 p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🎉</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#2C3E50]">{win.description}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8899a6]">
                {win.project && (
                  <Link href={`/projects/${win.project.id}`} className="text-[#1E6B5E] hover:underline">
                    {win.project.emoji} {win.project.name}
                  </Link>
                )}
                {win.actor && <span>· {win.actor.name}</span>}
                <span>· {formatDistanceToNow(win.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Wire up the Log page with tabs**

Replace `app/log/page.tsx`:
```tsx
import { getActivityLog, getWins } from '@/lib/queries/activity'
import { ActivityFeed } from '@/components/log/ActivityFeed'
import { WinWall } from '@/components/log/WinWall'
import { LogTabs } from '@/components/log/LogTabs'

export default async function LogPage() {
  const [activity, wins] = await Promise.all([
    getActivityLog(),
    getWins(),
  ])

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Activity</h1>
      <LogTabs
        activityContent={<ActivityFeed entries={activity} />}
        winContent={<WinWall wins={wins} />}
        winCount={wins.length}
      />
    </div>
  )
}
```

Create `components/log/LogTabs.tsx`:
```tsx
'use client'

import { useState, type ReactNode } from 'react'

interface LogTabsProps {
  activityContent: ReactNode
  winContent: ReactNode
  winCount: number
}

export function LogTabs({ activityContent, winContent, winCount }: LogTabsProps) {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')

  return (
    <div>
      <div className="flex mb-4">
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold rounded-l-lg transition-colors ${
            tab === 'activity' ? 'bg-[#1E6B5E] text-white' : 'bg-white text-[#8899a6] border border-black/10'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab('wins')}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold rounded-r-lg transition-colors ${
            tab === 'wins' ? 'bg-[#D4A853] text-white' : 'bg-white text-[#8899a6] border border-black/10 border-l-0'
          }`}
        >
          Win Wall 🏆 {winCount > 0 && `(${winCount})`}
        </button>
      </div>
      {tab === 'activity' ? activityContent : winContent}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add app/log/ components/log/ lib/queries/activity.ts
git commit -m "feat: build Activity Log and Win Wall with tabs"
```

---

### Task 3: Leads & Beta Testers on Project Detail

**Files:**
- Create: `components/project-detail/LeadsSection.tsx`
- Create: `lib/mutations/leads.ts`
- Modify: `app/projects/[id]/page.tsx` (add LeadsSection)

- [ ] **Step 1: Create lead mutations**

Create `lib/mutations/leads.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import type { InterestLevel } from '@/lib/types/database'

const supabase = createClient()

export async function addLead(data: {
  project_id: string
  name: string
  role_clinic?: string
  contact_email?: string
  source?: string
  interest_level?: InterestLevel
  added_by: string
}) {
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      project_id: data.project_id,
      name: data.name,
      role_clinic: data.role_clinic ?? null,
      contact_email: data.contact_email ?? null,
      source: data.source ?? null,
      interest_level: data.interest_level ?? 'warm',
      added_by: data.added_by,
    })
    .select()
    .single()

  if (error) throw error
  return lead
}

export async function promoteToBeta(leadId: string) {
  const { error } = await supabase
    .from('leads')
    .update({
      is_beta_tester: true,
      beta_invited_at: new Date().toISOString(),
      beta_accepted: 'pending',
    })
    .eq('id', leadId)

  if (error) throw error
}

export async function addLeadFeedback(data: {
  lead_id: string
  author_id: string
  content: string
}) {
  const { error } = await supabase
    .from('lead_feedback')
    .insert(data)

  if (error) throw error
}
```

- [ ] **Step 2: Create LeadsSection component**

Create `components/project-detail/LeadsSection.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { addLead, promoteToBeta } from '@/lib/mutations/leads'
import { useRouter } from 'next/navigation'
import type { Lead, InterestLevel } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

interface LeadsSectionProps {
  projectId: string
  leads: Lead[]
}

const interestIcons: Record<InterestLevel, string> = {
  hot: '🔥',
  warm: '👍',
  curious: '🤷',
}

export function LeadsSection({ projectId, leads }: LeadsSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [roleClinic, setRoleClinic] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [source, setSource] = useState('')
  const [interest, setInterest] = useState<InterestLevel>('warm')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const betaTesters = leads.filter((l) => l.is_beta_tester)
  const regularLeads = leads.filter((l) => !l.is_beta_tester)
  const feedbackPending = betaTesters.filter((l) => l.beta_feedback_status === 'awaiting').length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true)
    try {
      await addLead({
        project_id: projectId,
        name: name.trim(),
        role_clinic: roleClinic.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        source: source.trim() || undefined,
        interest_level: interest,
        added_by: user.id,
      })
      setName('')
      setRoleClinic('')
      setContactEmail('')
      setSource('')
      setInterest('warm')
      setShowAdd(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handlePromote(leadId: string) {
    await promoteToBeta(leadId)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-black/8 overflow-hidden mb-3">
      <div className="px-3.5 py-3 border-b border-black/5 flex justify-between items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
            Leads & Beta Testers
          </div>
          {leads.length > 0 && (
            <div className="text-[10px] text-[#8899a6] mt-0.5">
              {regularLeads.length} leads · {betaTesters.length} beta testers
              {feedbackPending > 0 && ` · ${feedbackPending} feedback pending`}
            </div>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="text-xs text-[#1E6B5E] font-medium">
          + Add Lead
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="px-3.5 py-3 border-b border-black/5 bg-[#F5F0E8]/50 space-y-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" required autoFocus />
          <input type="text" value={roleClinic} onChange={(e) => setRoleClinic(e.target.value)} placeholder="Role / Clinic" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" />
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" />
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="How they heard about it" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" />
          <div className="flex gap-2">
            {(['hot', 'warm', 'curious'] as InterestLevel[]).map((level) => (
              <button key={level} type="button" onClick={() => setInterest(level)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${interest === level ? 'bg-[#1E6B5E] text-white' : 'bg-white text-[#8899a6] border border-black/10'}`}>
                {interestIcons[level]} {level}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold disabled:opacity-50">{saving ? 'Adding...' : 'Add Lead'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-black/10 text-xs text-[#8899a6]">Cancel</button>
          </div>
        </form>
      )}

      {leads.length === 0 && !showAdd && (
        <div className="px-3.5 py-4 text-center text-sm text-[#8899a6]">No leads yet.</div>
      )}

      {leads.map((lead, i) => (
        <div key={lead.id} className={`px-3.5 py-3 ${i < leads.length - 1 ? 'border-b border-black/5' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#2C3E50]">
                {interestIcons[lead.interest_level]} {lead.name}
                {lead.is_beta_tester && <span className="ml-1.5 text-[9px] bg-[#1E6B5E] text-white px-1.5 py-0.5 rounded-full">BETA</span>}
              </div>
              {lead.role_clinic && <div className="text-[11px] text-[#8899a6]">{lead.role_clinic}</div>}
              {lead.source && <div className="text-[11px] text-[#8899a6] italic">via {lead.source}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8899a6]">{formatDistanceToNow(lead.created_at)}</span>
              {!lead.is_beta_tester && (
                <button onClick={() => handlePromote(lead.id)} className="text-[10px] text-[#1E6B5E] hover:underline">
                  → Beta
                </button>
              )}
            </div>
          </div>
          {lead.is_beta_tester && (
            <div className="mt-1.5 text-[11px] text-[#8899a6]">
              Accepted: {lead.beta_accepted ?? 'pending'} · Feedback: {lead.beta_feedback_status}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add LeadsSection to Project Detail page**

Add import and component to `app/projects/[id]/page.tsx`, after NotesLog:
```tsx
import { LeadsSection } from '@/components/project-detail/LeadsSection'

// ... in the return JSX, after <NotesLog />:
<LeadsSection projectId={project.id} leads={project.leads ?? []} />
```

- [ ] **Step 4: Commit**

```bash
git add components/project-detail/LeadsSection.tsx lib/mutations/leads.ts app/projects/[id]/page.tsx
git commit -m "feat: add Leads & Beta Testers section to Project Detail"
```

---

### Task 4: Enhanced Settings Page

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Build the full Settings page**

Replace `app/settings/page.tsx`:
```tsx
'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [name, setName] = useState(profile?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveName() {
    if (!profile || !name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ name: name.trim() }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-black/8 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-3">Profile</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8899a6] block mb-1">Name</label>
            <div className="flex gap-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm" />
              <button onClick={handleSaveName} disabled={saving} className="px-3 py-2 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold disabled:opacity-50">
                {saved ? '✓ Saved' : saving ? '...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8899a6] block mb-1">Role</label>
            <p className="text-sm text-[#2C3E50]">{profile?.role ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* Integrations Placeholder */}
      <div className="bg-white rounded-xl border border-black/8 p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-3">Integrations</div>
        <div className="space-y-3 text-sm text-[#8899a6]">
          <div className="flex justify-between items-center">
            <span>GitHub API Token</span>
            <span className="text-xs bg-[#F5F0E8] px-2 py-1 rounded">Phase 4</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Vercel API Token</span>
            <span className="text-xs bg-[#F5F0E8] px-2 py-1 rounded">Phase 4</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Slack Workspace</span>
            <span className="text-xs bg-[#F5F0E8] px-2 py-1 rounded">Phase 4</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors">
        Sign out
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: enhance Settings page with profile editing and integration placeholders"
```

---

## Phase 3 Complete Checklist

- [ ] Resources page with categorised links, search, seed data
- [ ] Activity Log with feed and Win Wall tabs
- [ ] Leads & Beta Testers on Project Detail
- [ ] Enhanced Settings page with profile editing
- [ ] App builds and runs without errors

**Next phase:** Phase 4 — Integrations (GitHub/Vercel sync, Slack bot)
