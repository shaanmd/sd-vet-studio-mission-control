# Revenue-First Dashboard — Phase 3: Finance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Finance section — Expenses tab with category breakdown + "Shaan paid / Deb paid" tallies, and Revenue tab with stream breakdown. Both tabs have full CRUD with inline forms.

**Architecture:** Client components for the tabbed UI and forms, server actions for mutations. Finance utilities from `lib/finance.ts` (Phase 1) drive all calculations.

**Tech Stack:** Next.js 15, Tailwind CSS 4, TypeScript, Supabase, `frontend-design` skill for visual polish.

**Prerequisite:** Phase 1 complete (finance utilities + queries exist).

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `components/finance/FinanceTabs.tsx` | Tab switcher (Expenses / Revenue) |
| Create | `components/finance/ExpenseSummaryBar.tsx` | Total + Shaan paid + Deb paid pills |
| Create | `components/finance/ExpenseList.tsx` | Expense rows with category + paid-by badges |
| Create | `components/finance/ExpenseCategoryBreakdown.tsx` | Collapsible totals by category |
| Create | `components/finance/LogExpenseForm.tsx` | Inline form: description, amount, category, project, paid-by |
| Create | `components/finance/RevenueSummaryBar.tsx` | Month total + all-time total |
| Create | `components/finance/RevenueList.tsx` | Revenue entry rows |
| Create | `components/finance/RevenueStreamBreakdown.tsx` | Collapsible totals by stream |
| Create | `components/finance/LogRevenueForm.tsx` | Inline form: description, amount, stream, project, date |
| Create | `app/api/finance/expenses/route.ts` | POST /api/finance/expenses |
| Create | `app/api/finance/revenue/route.ts` | POST /api/finance/revenue |
| Modify | `app/finance/page.tsx` | Full Finance page with both tabs |

---

### Task 1: Expense Tab Components

**Files:**
- Create: `components/finance/ExpenseSummaryBar.tsx`
- Create: `components/finance/ExpenseList.tsx`
- Create: `components/finance/ExpenseCategoryBreakdown.tsx`

- [ ] **Step 1: Write ExpenseSummaryBar**

```tsx
// components/finance/ExpenseSummaryBar.tsx
import type { Expense } from '@/lib/types'
import { getExpenseSummary, filterCurrentMonth } from '@/lib/finance'

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

interface Props { expenses: Expense[] }

export default function ExpenseSummaryBar({ expenses }: Props) {
  const monthExpenses = filterCurrentMonth(expenses, 'expense_date')
  const summary = getExpenseSummary(monthExpenses)
  const allTime = getExpenseSummary(expenses)

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-sm font-semibold">
        {fmt(summary.total)} this month
      </div>
      <div className="bg-teal-50 text-teal-700 rounded-full px-3 py-1.5 text-sm">
        Shaan paid: {fmt(allTime.shaanPaid)}
      </div>
      <div className="bg-purple-50 text-purple-700 rounded-full px-3 py-1.5 text-sm">
        Deb paid: {fmt(allTime.debPaid)}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write ExpenseList**

```tsx
// components/finance/ExpenseList.tsx
import type { Expense } from '@/lib/types'

const PAID_BY_STYLE: Record<string, string> = {
  shaan: 'bg-teal-50 text-teal-700',
  deb: 'bg-purple-50 text-purple-700',
  split: 'bg-gray-100 text-gray-600',
}
const PAID_BY_LABEL: Record<string, string> = {
  shaan: 'Shaan paid',
  deb: 'Deb paid',
  split: 'Split 50/50',
}

interface ExpenseWithProject extends Expense {
  project: { name: string; emoji: string } | null
}

interface Props {
  expenses: ExpenseWithProject[]
  categoryFilter: string
}

export default function ExpenseList({ expenses, categoryFilter }: Props) {
  const filtered = categoryFilter === 'all' ? expenses : expenses.filter(e => e.category === categoryFilter)

  if (filtered.length === 0) {
    return <p className="text-center text-gray-400 py-6 text-sm">No expenses yet.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {filtered.map(expense => (
        <div key={expense.id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 text-sm">{expense.description}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              {expense.project
                ? <span>{expense.project.emoji} {expense.project.name}</span>
                : <span>🌐 General</span>
              }
              <span>·</span>
              <span className="capitalize">{expense.category.replace('_', ' ')}</span>
              <span>·</span>
              <span>{new Date(expense.expense_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="font-bold text-red-500 text-sm">
              −${expense.amount.toFixed(2)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAID_BY_STYLE[expense.paid_by]}`}>
              {PAID_BY_LABEL[expense.paid_by]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write ExpenseCategoryBreakdown**

```tsx
// components/finance/ExpenseCategoryBreakdown.tsx
'use client'
import { useState } from 'react'
import type { Expense } from '@/lib/types'
import { getExpenseSummary } from '@/lib/finance'

const CATEGORY_LABELS: Record<string, string> = {
  hosting: 'Hosting',
  domains: 'Domains',
  subscriptions: 'Subscriptions',
  tools_ai: 'Tools & AI',
  marketing: 'Marketing',
  other: 'Other',
}

interface Props { expenses: Expense[] }

export default function ExpenseCategoryBreakdown({ expenses }: Props) {
  const [open, setOpen] = useState(false)
  const summary = getExpenseSummary(expenses)

  const categories = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a)

  return (
    <div className="bg-[#f9f5ef] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>Category breakdown</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {categories.map(([cat, total]) => (
            <div key={cat} className="flex justify-between text-sm">
              <span className="text-gray-600">{CATEGORY_LABELS[cat] ?? cat}</span>
              <span className="font-semibold text-gray-800">${total.toFixed(2)}</span>
            </div>
          ))}
          {categories.length === 0 && <p className="text-gray-400 text-sm">No expenses logged.</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/finance/ExpenseSummaryBar.tsx components/finance/ExpenseList.tsx components/finance/ExpenseCategoryBreakdown.tsx
git commit -m "feat: expense summary bar, expense list, category breakdown components"
```

---

### Task 2: Log Expense Form

**Files:**
- Create: `components/finance/LogExpenseForm.tsx`
- Create: `app/api/finance/expenses/route.ts`

- [ ] **Step 1: Write the API route**

```typescript
// app/api/finance/expenses/route.ts
import { createClient } from '@/lib/supabase'
import { logExpense } from '@/lib/queries/revenue'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  if (!body.description || !body.amount || !body.category || !body.paid_by) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  await logExpense({ ...body, created_by: user.id })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Write LogExpenseForm**

```tsx
// components/finance/LogExpenseForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExpenseCategory, PaidBy } from '@/lib/types'

const CATEGORIES: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'hosting', label: 'Hosting' },
  { value: 'domains', label: 'Domains' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'tools_ai', label: 'Tools & AI' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  onClose: () => void
}

export default function LogExpenseForm({ projects, onClose }: Props) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [projectId, setProjectId] = useState<string>('')
  const [paidBy, setPaidBy] = useState<PaidBy>('shaan')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description.trim(),
        amount: Number(amount),
        category,
        project_id: projectId || null,
        paid_by: paidBy,
        expense_date: date,
      }),
    })
    if (!res.ok) { setError('Failed to save. Try again.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Log Expense</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (e.g. sdvetroute.com domain)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount ($)"
              type="number"
              step="0.01"
              min="0"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseCategory)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">🌐 General</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
            </select>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value as PaidBy)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="shaan">Shaan paid</option>
              <option value="deb">Deb paid</option>
              <option value="split">Split 50/50</option>
            </select>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/finance/LogExpenseForm.tsx app/api/finance/expenses/route.ts
git commit -m "feat: log expense form + API route"
```

---

### Task 3: Revenue Tab Components

**Files:**
- Create: `components/finance/RevenueSummaryBar.tsx`
- Create: `components/finance/RevenueList.tsx`
- Create: `components/finance/RevenueStreamBreakdown.tsx`
- Create: `components/finance/LogRevenueForm.tsx`
- Create: `app/api/finance/revenue/route.ts`

- [ ] **Step 1: Write RevenueSummaryBar**

```tsx
// components/finance/RevenueSummaryBar.tsx
import type { RevenueEntry } from '@/lib/types'
import { getRevenueTotal, filterCurrentMonth } from '@/lib/finance'

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

interface Props { entries: RevenueEntry[] }

export default function RevenueSummaryBar({ entries }: Props) {
  const monthEntries = filterCurrentMonth(entries, 'revenue_date')
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="bg-teal-50 text-teal-700 rounded-full px-3 py-1.5 text-sm font-semibold">
        {fmt(getRevenueTotal(monthEntries))} this month
      </div>
      <div className="bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-sm">
        All time: {fmt(getRevenueTotal(entries))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write RevenueList**

```tsx
// components/finance/RevenueList.tsx
import type { RevenueEntry } from '@/lib/types'

const STREAM_LABELS: Record<string, string> = {
  course: '🎓 Course',
  subscription: '🔄 Subscription',
  inapp: '📱 In-app',
  consulting: '💼 Consulting',
  sponsorship: '🤝 Sponsorship',
  affiliate: '🔗 Affiliate',
  other: '📦 Other',
}

interface RevenueWithProject extends RevenueEntry {
  project: { name: string; emoji: string } | null
}

interface Props { entries: RevenueWithProject[] }

export default function RevenueList({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="text-center text-gray-400 py-6 text-sm">No revenue logged yet. Every dollar counts! 💰</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map(entry => (
        <div key={entry.id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 text-sm">{entry.description}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              <span>{STREAM_LABELS[entry.stream] ?? entry.stream}</span>
              {entry.project && <><span>·</span><span>{entry.project.emoji} {entry.project.name}</span></>}
              <span>·</span>
              <span>{new Date(entry.revenue_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <span className="font-bold text-teal-700 text-sm shrink-0">+${entry.amount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Write RevenueStreamBreakdown**

```tsx
// components/finance/RevenueStreamBreakdown.tsx
'use client'
import { useState } from 'react'
import type { RevenueEntry } from '@/lib/types'
import { getRevenueByStream } from '@/lib/finance'

const STREAM_LABELS: Record<string, string> = {
  course: '🎓 Course sales',
  subscription: '🔄 Subscriptions',
  inapp: '📱 In-app / tokens',
  consulting: '💼 Consulting',
  sponsorship: '🤝 Sponsorship',
  affiliate: '🔗 Affiliate',
  other: '📦 Other',
}

interface Props { entries: RevenueEntry[] }

export default function RevenueStreamBreakdown({ entries }: Props) {
  const [open, setOpen] = useState(false)
  const byStream = getRevenueByStream(entries)
  const sorted = Object.entries(byStream).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))

  return (
    <div className="bg-[#f9f5ef] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>Revenue by stream</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {sorted.map(([stream, total]) => (
            <div key={stream} className="flex justify-between text-sm">
              <span className="text-gray-600">{STREAM_LABELS[stream] ?? stream}</span>
              <span className="font-semibold text-gray-800">${(total ?? 0).toFixed(2)}</span>
            </div>
          ))}
          {sorted.length === 0 && <p className="text-gray-400 text-sm">No revenue logged.</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Write API route for revenue**

```typescript
// app/api/finance/revenue/route.ts
import { createClient } from '@/lib/supabase'
import { logRevenue } from '@/lib/queries/revenue'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  if (!body.description || !body.amount || !body.stream) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  await logRevenue({ ...body, created_by: user.id })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Write LogRevenueForm**

```tsx
// components/finance/LogRevenueForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RevenueStream } from '@/lib/types'

const STREAMS: Array<{ value: RevenueStream; label: string }> = [
  { value: 'course', label: '🎓 Course sales' },
  { value: 'subscription', label: '🔄 Subscription' },
  { value: 'inapp', label: '📱 In-app / tokens' },
  { value: 'consulting', label: '💼 Consulting' },
  { value: 'sponsorship', label: '🤝 Sponsorship' },
  { value: 'affiliate', label: '🔗 Affiliate' },
  { value: 'other', label: '📦 Other' },
]

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  onClose: () => void
}

export default function LogRevenueForm({ projects, onClose }: Props) {
  const router = useRouter()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [stream, setStream] = useState<RevenueStream>('other')
  const [projectId, setProjectId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('Description is required'); return }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) { setError('Enter a valid amount'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/finance/revenue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: description.trim(),
        amount: Number(amount),
        stream,
        project_id: projectId || null,
        revenue_date: date,
      }),
    })
    if (!res.ok) { setError('Failed to save. Try again.'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">💰 Log Revenue</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. VetScribe Pro — 3 new subscriptions"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <div className="flex gap-2">
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount ($)"
              type="number"
              step="0.01"
              min="0"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <select
              value={stream}
              onChange={e => setStream(e.target.value as RevenueStream)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {STREAMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">No specific project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Log Revenue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add components/finance/Revenue*.tsx components/finance/LogRevenueForm.tsx app/api/finance/revenue/route.ts
git commit -m "feat: revenue tab components + log revenue form + API route"
```

---

### Task 4: Assemble Finance Page

**Files:**
- Create: `components/finance/FinanceTabs.tsx`
- Modify: `app/finance/page.tsx`

- [ ] **Step 1: Write FinanceTabs (category filter pills)**

```tsx
// components/finance/FinanceTabs.tsx
'use client'
import { useState } from 'react'
import ExpenseSummaryBar from './ExpenseSummaryBar'
import ExpenseList from './ExpenseList'
import ExpenseCategoryBreakdown from './ExpenseCategoryBreakdown'
import LogExpenseForm from './LogExpenseForm'
import RevenueSummaryBar from './RevenueSummaryBar'
import RevenueList from './RevenueList'
import RevenueStreamBreakdown from './RevenueStreamBreakdown'
import LogRevenueForm from './LogRevenueForm'
import type { Expense, RevenueEntry } from '@/lib/types'

const EXPENSE_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'hosting', label: 'Hosting' },
  { value: 'domains', label: 'Domains' },
  { value: 'subscriptions', label: 'Subscriptions' },
  { value: 'tools_ai', label: 'Tools & AI' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'other', label: 'Other' },
]

interface ExpenseWithProject extends Expense {
  project: { name: string; emoji: string } | null
}
interface RevenueWithProject extends RevenueEntry {
  project: { name: string; emoji: string } | null
}

interface Props {
  expenses: ExpenseWithProject[]
  revenueEntries: RevenueWithProject[]
  projects: Array<{ id: string; name: string; emoji: string }>
  defaultTab?: 'expenses' | 'revenue'
}

export default function FinanceTabs({ expenses, revenueEntries, projects, defaultTab = 'expenses' }: Props) {
  const [tab, setTab] = useState<'expenses' | 'revenue'>(defaultTab)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showRevenueForm, setShowRevenueForm] = useState(false)

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex bg-teal-50 rounded-xl p-1 mb-5 gap-1">
        <button
          onClick={() => setTab('expenses')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'expenses' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}
        >
          💸 Expenses
        </button>
        <button
          onClick={() => setTab('revenue')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'revenue' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}
        >
          📈 Revenue
        </button>
      </div>

      {tab === 'expenses' && (
        <>
          <ExpenseSummaryBar expenses={expenses} />
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
            {EXPENSE_CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategoryFilter(c.value)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  categoryFilter === c.value ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <ExpenseCategoryBreakdown expenses={expenses} />
          <ExpenseList expenses={expenses} categoryFilter={categoryFilter} />
          <button
            onClick={() => setShowExpenseForm(true)}
            className="mt-4 w-full bg-teal-700 text-white rounded-xl py-3 font-semibold"
          >
            + Log Expense
          </button>
          {showExpenseForm && <LogExpenseForm projects={projects} onClose={() => setShowExpenseForm(false)} />}
        </>
      )}

      {tab === 'revenue' && (
        <>
          <RevenueSummaryBar entries={revenueEntries} />
          <RevenueStreamBreakdown entries={revenueEntries} />
          <RevenueList entries={revenueEntries} />
          <button
            onClick={() => setShowRevenueForm(true)}
            className="mt-4 w-full bg-amber-500 text-white rounded-xl py-3 font-semibold"
          >
            💰 Log Revenue
          </button>
          {showRevenueForm && <LogRevenueForm projects={projects} onClose={() => setShowRevenueForm(false)} />}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write the Finance page**

```tsx
// app/finance/page.tsx
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getProjects } from '@/lib/queries/projects'
import FinanceTabs from '@/components/finance/FinanceTabs'

export default async function FinancePage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  const [expenses, revenueEntries, projects] = await Promise.all([
    getExpenses(),
    getRevenueEntries(),
    getProjects(),
  ])

  const defaultTab = searchParams.tab === 'revenue' ? 'revenue' : 'expenses'

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">💰 Finance</h1>
      <FinanceTabs
        expenses={expenses as any}
        revenueEntries={revenueEntries as any}
        projects={projects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }))}
        defaultTab={defaultTab}
      />
    </div>
  )
}
```

- [ ] **Step 3: Test in browser — log an expense and a revenue entry**

```bash
npm run dev
```

Go to `/finance`. Log an expense: "Supabase Pro", $25, Hosting, General, Shaan paid. Log a revenue entry: "VetScribe — 1 sub", $29, Subscription. Verify:
- Expense appears in list with "Shaan paid" badge
- "Shaan paid: $25" tally updates in summary bar
- Revenue appears with +$29 in green
- Home screen revenue tiles update (navigate to `/`)

- [ ] **Step 4: Commit**

```bash
git add components/finance/FinanceTabs.tsx app/finance/page.tsx
git commit -m "feat: full Finance section — expense + revenue tabs, log forms, tallies"
```

---

### Task 5: Phase 3 Smoke Test

- [ ] **Step 1: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Final commit if fixes needed**

```bash
git add -A && git commit -m "fix: phase 3 smoke test fixes"
```

**Phase 3 complete.** Finance section is fully functional — expenses with paid-by tracking, revenue by stream, and both surface on the Home screen revenue tiles. Ready for Phase 4: Supporting Screens.
