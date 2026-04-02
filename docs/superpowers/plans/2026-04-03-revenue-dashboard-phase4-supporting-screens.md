# Revenue-First Dashboard — Phase 4: Supporting Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Marketing, Leads, Log & Win Wall, Resources, and Settings screens. All are functional CRUD screens using established patterns from Phases 2–3.

**Architecture:** Same pattern throughout — server page component fetches data, client child components handle interactivity. API routes for mutations.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase. Invoke `frontend-design` skill before implementing any screen UI.

**Prerequisite:** Phases 1–3 complete.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/queries/marketing.ts` | Content item CRUD |
| Create | `lib/queries/leads.ts` | Lead + lead note CRUD |
| Create | `lib/queries/activity.ts` | Activity log + win wall queries |
| Create | `lib/queries/resources.ts` | Resources CRUD |
| Create | `components/marketing/ToolLinksGrid.tsx` | Quick-launch tool links |
| Create | `components/marketing/ContentCalendar.tsx` | Content items list + add form |
| Create | `app/marketing/page.tsx` | Full Marketing page |
| Create | `app/api/marketing/content/route.ts` | POST content item |
| Create | `components/leads/LeadCard.tsx` | Single lead card |
| Create | `components/leads/AddLeadForm.tsx` | Add/edit lead form |
| Create | `components/leads/LeadNotesThread.tsx` | Notes thread per lead |
| Create | `app/leads/page.tsx` | Global leads list |
| Create | `app/api/leads/route.ts` | POST lead |
| Create | `app/api/leads/[id]/notes/route.ts` | POST lead note |
| Create | `components/log/ActivityFeed.tsx` | Reverse-chron event feed |
| Create | `components/log/WinWall.tsx` | Wins-only filtered feed + AI summary |
| Create | `app/log/page.tsx` | Log & Win Wall tabbed page |
| Create | `components/resources/ResourceList.tsx` | Grouped resource links |
| Create | `app/resources/page.tsx` | Resources page |
| Create | `app/api/resources/route.ts` | POST resource |
| Create | `app/settings/page.tsx` | Settings page |
| Create | `app/api/tasks/[id]/complete/route.ts` | PATCH — mark task complete |
| Create | `app/api/tasks/[id]/next-step/route.ts` | PATCH — set as next step |

---

### Task 1: Query Layer for Supporting Screens

**Files:**
- Create: `lib/queries/marketing.ts`
- Create: `lib/queries/leads.ts`
- Create: `lib/queries/activity.ts`
- Create: `lib/queries/resources.ts`

- [ ] **Step 1: Write marketing queries**

```typescript
// lib/queries/marketing.ts
import { createClient } from '@/lib/supabase'
import type { ContentItem } from '@/lib/types'

export async function getContentItems(projectId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('content_items')
    .select('*, project:projects(name, emoji)')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return data as (ContentItem & { project: { name: string; emoji: string } | null })[]
}

export async function createContentItem(values: {
  description: string
  platform: string
  project_id?: string | null
  scheduled_date?: string | null
  created_by: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('content_items').insert({ status: 'draft', ...values })
  if (error) throw error
}

export async function updateContentItemStatus(id: string, status: 'draft' | 'scheduled' | 'published') {
  const supabase = createClient()
  const { error } = await supabase.from('content_items').update({ status }).eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 2: Write leads queries**

```typescript
// lib/queries/leads.ts
import { createClient } from '@/lib/supabase'
import type { Lead, LeadNote } from '@/lib/types'

export async function getLeads(projectId?: string) {
  const supabase = createClient()
  let query = supabase
    .from('leads')
    .select('*, project:projects(name, emoji), added_by_profile:profiles!leads_added_by_fkey(name)')
    .order('created_at', { ascending: false })
  if (projectId) query = query.eq('project_id', projectId)
  const { data, error } = await query
  if (error) throw error
  return data as (Lead & { project: { name: string; emoji: string }; added_by_profile: { name: string } | null })[]
}

export async function createLead(values: {
  project_id: string
  name: string
  role_clinic?: string
  contact_email?: string
  contact_phone?: string
  source?: string
  interest_level?: string
  added_by: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.from('leads').insert(values).select().single()
  if (error) throw error
  return data as Lead
}

export async function updateLead(id: string, values: Partial<Lead>) {
  const supabase = createClient()
  const { error } = await supabase.from('leads').update(values).eq('id', id)
  if (error) throw error
}

export async function getLeadNotes(leadId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*, author:profiles(name)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as (LeadNote & { author: { name: string } | null })[]
}

export async function addLeadNote(leadId: string, content: string, authorId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: leadId, content, author_id: authorId })
  if (error) throw error
}
```

- [ ] **Step 3: Write activity queries**

```typescript
// lib/queries/activity.ts
import { createClient } from '@/lib/supabase'
import type { ActivityLog } from '@/lib/types'

export async function getActivityLog(limit = 50) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, project:projects(name, emoji), actor:profiles(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as (ActivityLog & {
    project: { name: string; emoji: string } | null
    actor: { name: string } | null
  })[]
}

export async function getWins(limit = 100) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('*, project:projects(name, emoji), actor:profiles(name)')
    .eq('is_win', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as (ActivityLog & {
    project: { name: string; emoji: string } | null
    actor: { name: string } | null
  })[]
}
```

- [ ] **Step 4: Write resources queries**

```typescript
// lib/queries/resources.ts
import { createClient } from '@/lib/supabase'
import type { Resource } from '@/lib/types'

export async function getResources() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('category')
    .order('sort_order')
  if (error) throw error
  return data as Resource[]
}

export async function createResource(values: {
  category: string
  name: string
  description?: string
  url?: string
  icon?: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('resources').insert({ icon: '🔗', sort_order: 99, ...values })
  if (error) throw error
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/queries/marketing.ts lib/queries/leads.ts lib/queries/activity.ts lib/queries/resources.ts
git commit -m "feat: query layer for marketing, leads, activity log, resources"
```

---

### Task 2: Marketing Screen

**Files:**
- Create: `components/marketing/ToolLinksGrid.tsx`
- Create: `components/marketing/ContentCalendar.tsx`
- Modify: `app/marketing/page.tsx`
- Create: `app/api/marketing/content/route.ts`

- [ ] **Step 1: Write ToolLinksGrid**

```tsx
// components/marketing/ToolLinksGrid.tsx
const TOOLS = [
  { name: 'Canva', icon: '🎨', url: 'https://www.canva.com' },
  { name: 'Blotato', icon: '📱', url: 'https://blotato.com' },
  { name: 'Meta Suite', icon: '👥', url: 'https://business.facebook.com' },
  { name: 'Content360', icon: '📅', url: 'https://content360.com' },
  { name: 'CapCut', icon: '🎬', url: 'https://www.capcut.com' },
  { name: 'YouTube Studio', icon: '▶️', url: 'https://studio.youtube.com' },
]

export default function ToolLinksGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {TOOLS.map(tool => (
        <a
          key={tool.name}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-3 text-center hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-1">{tool.icon}</div>
          <div className="text-xs font-medium text-gray-700">{tool.name}</div>
        </a>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write ContentCalendar**

```tsx
// components/marketing/ContentCalendar.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ContentItem } from '@/lib/types'

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸',
  tiktok: '🎵',
  email: '📧',
  youtube: '▶️',
  other: '📣',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
}

interface ContentWithProject extends ContentItem {
  project: { name: string; emoji: string } | null
}

interface Props {
  items: ContentWithProject[]
  projects: Array<{ id: string; name: string; emoji: string }>
}

export default function ContentCalendar({ items, projects }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [description, setDescription] = useState('')
  const [platform, setPlatform] = useState('instagram')
  const [projectId, setProjectId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) return
    setSaving(true)
    await fetch('/api/marketing/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, platform, project_id: projectId || null, scheduled_date: scheduledDate || null }),
    })
    setDescription(''); setProjectId(''); setScheduledDate(''); setAdding(false); setSaving(false)
    router.refresh()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/marketing/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-700">Content Calendar</h2>
        <button onClick={() => setAdding(true)} className="text-sm text-teal-600 font-medium">+ Add</button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl p-4 mb-3 flex flex-col gap-2">
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What's the content?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" autoFocus />
          <div className="flex gap-2">
            <select value={platform} onChange={e => setPlatform(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {Object.entries(PLATFORM_EMOJI).map(([v, e]) => <option key={v} value={v}>{e} {v}</option>)}
            </select>
            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
          </div>
          <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg bg-teal-700 text-white text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-xl mt-0.5">{PLATFORM_EMOJI[item.platform]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 font-medium">{item.description}</div>
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                {item.project && <span>{item.project.emoji} {item.project.name}</span>}
                {item.scheduled_date && <span>· {new Date(item.scheduled_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>}
              </div>
            </div>
            <select
              value={item.status}
              onChange={e => handleStatusChange(item.id, e.target.value)}
              className={`text-xs px-2 py-1 rounded-full font-medium border-0 ${STATUS_STYLE[item.status]}`}
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
            </select>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No content planned yet.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: API routes for content**

```typescript
// app/api/marketing/content/route.ts
import { createClient } from '@/lib/supabase'
import { createContentItem } from '@/lib/queries/marketing'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  await createContentItem({ ...body, created_by: user.id })
  return NextResponse.json({ ok: true })
}
```

```typescript
// app/api/marketing/content/[id]/route.ts
import { createClient } from '@/lib/supabase'
import { updateContentItemStatus } from '@/lib/queries/marketing'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { status } = await req.json()
  await updateContentItemStatus(params.id, status)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Assemble Marketing page**

```tsx
// app/marketing/page.tsx
import { getContentItems } from '@/lib/queries/marketing'
import { getProjects } from '@/lib/queries/projects'
import ToolLinksGrid from '@/components/marketing/ToolLinksGrid'
import ContentCalendar from '@/components/marketing/ContentCalendar'

export default async function MarketingPage() {
  const [items, projects] = await Promise.all([getContentItems(), getProjects()])
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">📣 Marketing</h1>
      <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Tools</h2>
      <ToolLinksGrid />
      <ContentCalendar
        items={items as any}
        projects={projects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }))}
      />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/marketing/ app/marketing/page.tsx app/api/marketing/
git commit -m "feat: marketing screen — tool links grid + content calendar"
```

---

### Task 3: Leads Screen

**Files:**
- Create: `components/leads/LeadCard.tsx`
- Create: `components/leads/AddLeadForm.tsx`
- Modify: `app/leads/page.tsx`
- Create: `app/api/leads/route.ts`
- Create: `app/api/leads/[id]/notes/route.ts`

- [ ] **Step 1: Write LeadCard**

```tsx
// components/leads/LeadCard.tsx
import type { Lead } from '@/lib/types'

const INTEREST_EMOJI: Record<string, string> = { hot: '🔥', warm: '👍', curious: '🤷' }
const INTEREST_STYLE: Record<string, string> = {
  hot: 'bg-red-50 text-red-600',
  warm: 'bg-amber-50 text-amber-600',
  curious: 'bg-gray-100 text-gray-500',
}

interface LeadWithRelations extends Lead {
  project: { name: string; emoji: string }
  added_by_profile: { name: string } | null
}

interface Props {
  lead: LeadWithRelations
}

export default function LeadCard({ lead }: Props) {
  return (
    <div className="bg-white rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <div className="font-semibold text-gray-800">{lead.name}</div>
          {lead.role_clinic && <div className="text-xs text-gray-500">{lead.role_clinic}</div>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${INTEREST_STYLE[lead.interest_level]}`}>
          {INTEREST_EMOJI[lead.interest_level]} {lead.interest_level}
        </span>
      </div>
      <div className="text-xs text-gray-400 flex flex-wrap gap-2 mt-1">
        <span>{lead.project.emoji} {lead.project.name}</span>
        {lead.source && <span>· {lead.source}</span>}
        {lead.contact_email && <span>· {lead.contact_email}</span>}
        {lead.is_beta_tester && <span className="text-teal-600 font-medium">· Beta tester</span>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write AddLeadForm**

```tsx
// components/leads/AddLeadForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InterestLevel } from '@/lib/types'

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  defaultProjectId?: string
  onClose: () => void
}

export default function AddLeadForm({ projects, defaultProjectId, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [roleClinic, setRoleClinic] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [interestLevel, setInterestLevel] = useState<InterestLevel>('warm')
  const [projectId, setProjectId] = useState(defaultProjectId ?? (projects[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (!projectId) { setError('Select a project'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), role_clinic: roleClinic || null, contact_email: email || null,
        contact_phone: phone || null, source: source || null, interest_level: interestLevel, project_id: projectId,
      }),
    })
    if (!res.ok) { setError('Failed to save'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Add Lead</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Name *" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input value={roleClinic} onChange={e => setRoleClinic(e.target.value)} placeholder="Role / clinic" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input value={source} onChange={e => setSource(e.target.value)} placeholder="How they heard about it" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            {(['hot', 'warm', 'curious'] as InterestLevel[]).map(level => (
              <button key={level} type="button" onClick={() => setInterestLevel(level)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${interestLevel === level ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'}`}
              >
                {{ hot: '🔥', warm: '👍', curious: '🤷' }[level]} {level}
              </button>
            ))}
          </div>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write API routes for leads**

```typescript
// app/api/leads/route.ts
import { createClient } from '@/lib/supabase'
import { createLead } from '@/lib/queries/leads'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.name || !body.project_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const lead = await createLead({ ...body, added_by: user.id })
  return NextResponse.json(lead)
}
```

```typescript
// app/api/leads/[id]/notes/route.ts
import { createClient } from '@/lib/supabase'
import { addLeadNote } from '@/lib/queries/leads'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 })
  await addLeadNote(params.id, content, user.id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Assemble Leads page**

```tsx
// app/leads/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Note: this page uses client-side data fetching since it needs the add form
// In Next.js 15, you can mix — fetch initial data server-side via a layout or use a server component wrapper

export { default } from '@/components/leads/LeadsPageClient'
```

```tsx
// components/leads/LeadsPageClient.tsx
'use client'
import { useState, useEffect } from 'react'
import LeadCard from './LeadCard'
import AddLeadForm from './AddLeadForm'

export default function LeadsPageClient() {
  const [leads, setLeads] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'curious'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [leadsRes, projectsRes] = await Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ])
    setLeads(leadsRes)
    setProjects(projectsRes)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? leads : leads.filter((l: any) => l.interest_level === filter)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">🎯 Leads</h1>
        <button onClick={() => setShowAdd(true)} className="bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl">+ Add Lead</button>
      </div>
      <div className="flex gap-2 mb-4">
        {(['all', 'hot', 'warm', 'curious'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${filter === f ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {f === 'hot' ? '🔥' : f === 'warm' ? '👍' : f === 'curious' ? '🤷' : ''} {f}
          </button>
        ))}
      </div>
      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
      <div className="flex flex-col gap-2">
        {filtered.map((lead: any) => <LeadCard key={lead.id} lead={lead} />)}
        {!loading && filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No leads yet.</p>}
      </div>
      {showAdd && <AddLeadForm projects={projects} onClose={() => { setShowAdd(false); load() }} />}
    </div>
  )
}
```

- [ ] **Step 5: Add GET handler to leads API route**

Open `app/api/leads/route.ts` and add a GET handler:

```typescript
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('leads')
    .select('*, project:projects(name, emoji), added_by_profile:profiles!leads_added_by_fkey(name)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 6: Commit**

```bash
git add components/leads/ app/leads/page.tsx app/api/leads/
git commit -m "feat: leads screen — lead cards, add lead form, interest filter"
```

---

### Task 4: Log & Win Wall

**Files:**
- Create: `components/log/ActivityFeed.tsx`
- Create: `components/log/WinWall.tsx`
- Modify: `app/log/page.tsx`

- [ ] **Step 1: Write ActivityFeed**

```tsx
// components/log/ActivityFeed.tsx
import type { ActivityLog } from '@/lib/types'

const ACTION_EMOJI: Record<string, string> = {
  task_completed: '✅',
  stage_changed: '🔄',
  deployed: '🚀',
  note_added: '📝',
  project_created: '✨',
  revenue_logged: '💰',
  default: '•',
}

interface ActivityWithRelations extends ActivityLog {
  project: { name: string; emoji: string } | null
  actor: { name: string } | null
}

interface Props { activities: ActivityWithRelations[] }

export default function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return <p className="text-center text-gray-400 py-8 text-sm">No activity yet — complete a task to see it here!</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {activities.map(activity => (
        <div key={activity.id} className="bg-white rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-lg mt-0.5">{ACTION_EMOJI[activity.action] ?? ACTION_EMOJI.default}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-800">{activity.description}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              {activity.project && <span>{activity.project.emoji} {activity.project.name}</span>}
              {activity.actor && <><span>·</span><span>{activity.actor.name}</span></>}
              <span>·</span>
              <span>{new Date(activity.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write WinWall**

```tsx
// components/log/WinWall.tsx
import type { ActivityLog } from '@/lib/types'

interface ActivityWithRelations extends ActivityLog {
  project: { name: string; emoji: string } | null
  actor: { name: string } | null
}

interface Props { wins: ActivityWithRelations[] }

export default function WinWall({ wins }: Props) {
  if (wins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-gray-400 text-sm">Complete your first task and it'll show up here! 🎉</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {wins.map(win => (
        <div key={win.id} className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
          win.action === 'revenue_logged' ? 'bg-amber-50 border border-amber-100' : 'bg-teal-50 border border-teal-100'
        }`}>
          <span className="text-lg mt-0.5">
            {win.action === 'revenue_logged' ? '💰' : win.action === 'stage_changed' ? '🚀' : '✅'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800">{win.description}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              {win.project && <span>{win.project.emoji} {win.project.name}</span>}
              <span>·</span>
              <span>{new Date(win.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Assemble Log page**

```tsx
// app/log/page.tsx
'use client'
import { useState, useEffect } from 'react'
import ActivityFeed from '@/components/log/ActivityFeed'
import WinWall from '@/components/log/WinWall'

export default function LogPage() {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')
  const [activities, setActivities] = useState<any[]>([])
  const [wins, setWins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/log/activity').then(r => r.json()),
      fetch('/api/log/wins').then(r => r.json()),
    ]).then(([a, w]) => { setActivities(a); setWins(w); setLoading(false) })
  }, [])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏆 Log & Wins</h1>
      <div className="flex bg-teal-50 rounded-xl p-1 mb-5 gap-1">
        <button onClick={() => setTab('activity')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'activity' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}>Activity</button>
        <button onClick={() => setTab('wins')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'wins' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}>🏆 Win Wall</button>
      </div>
      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
      {!loading && tab === 'activity' && <ActivityFeed activities={activities} />}
      {!loading && tab === 'wins' && <WinWall wins={wins} />}
    </div>
  )
}
```

- [ ] **Step 4: Add API routes for log**

```typescript
// app/api/log/activity/route.ts
import { createClient } from '@/lib/supabase'
import { getActivityLog } from '@/lib/queries/activity'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getActivityLog()
  return NextResponse.json(data)
}
```

```typescript
// app/api/log/wins/route.ts
import { createClient } from '@/lib/supabase'
import { getWins } from '@/lib/queries/activity'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await getWins()
  return NextResponse.json(data)
}
```

- [ ] **Step 5: Commit**

```bash
git add components/log/ app/log/page.tsx app/api/log/
git commit -m "feat: log & win wall — activity feed + wins tab"
```

---

### Task 5: Resources & Settings

**Files:**
- Create: `components/resources/ResourceList.tsx`
- Modify: `app/resources/page.tsx`
- Modify: `app/settings/page.tsx`
- Create: `app/api/resources/route.ts`

- [ ] **Step 1: Write ResourceList**

```tsx
// components/resources/ResourceList.tsx
import type { Resource } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  dev: '🛠 Dev & Deployment',
  marketing: '📣 Marketing & Content',
  ai: '🤖 AI Tools',
  business: '💼 Business',
  brand: '🎨 Brand',
  contacts: '👥 Contacts',
}

interface Props {
  resources: Resource[]
}

export default function ResourceList({ resources }: Props) {
  const grouped = resources.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {} as Record<string, Resource[]>)

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
        const items = grouped[cat]
        if (!items?.length) return null
        return (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h2>
            <div className="flex flex-col gap-2">
              {items.map(r => (
                <a
                  key={r.id}
                  href={r.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="text-xl">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{r.name}</div>
                    {r.description && <div className="text-xs text-gray-400 truncate">{r.description}</div>}
                  </div>
                  <span className="text-gray-300 text-sm">↗</span>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Assemble Resources page**

```tsx
// app/resources/page.tsx
import { getResources } from '@/lib/queries/resources'
import ResourceList from '@/components/resources/ResourceList'

export default async function ResourcesPage() {
  const resources = await getResources()
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">🔗 Resources</h1>
      <ResourceList resources={resources} />
    </div>
  )
}
```

- [ ] **Step 3: Write Settings page**

```tsx
// app/settings/page.tsx
import { createClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6">⚙️ Settings</h1>

      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Profile</h2>
        <div className="text-sm text-gray-600">
          <div className="mb-1"><span className="text-gray-400">Name:</span> {profile?.name ?? '—'}</div>
          <div className="mb-1"><span className="text-gray-400">Email:</span> {user.email}</div>
          <div><span className="text-gray-400">Role:</span> {profile?.role ?? '—'}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-1">Slack</h2>
        <p className="text-sm text-gray-400">Slack integration — coming in Phase 5.</p>
      </div>

      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-1">GitHub / Vercel</h2>
        <p className="text-sm text-gray-400">API token configuration — coming in Phase 5.</p>
      </div>

      <form action="/api/auth/signout" method="POST">
        <button type="submit" className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium text-sm">
          Sign out
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Write sign-out API route**

```typescript
// app/api/auth/signout/route.ts
import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
}
```

- [ ] **Step 5: Commit**

```bash
git add components/resources/ app/resources/page.tsx app/settings/page.tsx app/api/resources/ app/api/auth/
git commit -m "feat: resources page, settings page, sign out"
```

---

### Task 6: Phase 4 Smoke Test

- [ ] **Step 1: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: 0 TypeScript errors.

- [ ] **Step 3: Walk all 8 routes manually in dev mode**

```bash
npm run dev
```

Visit: Home, Projects, Finance, Marketing, Leads, Log, Resources, Settings. Confirm: no 404s, no console errors, all nav items active-highlight correctly.

- [ ] **Step 4: Final commit**

```bash
git add -A && git commit -m "fix: phase 4 smoke test — all supporting screens functional"
```

**Phase 4 complete.** All screens are functional. The full app is navigable end-to-end. Ready for Phase 5: Integrations & AI.
