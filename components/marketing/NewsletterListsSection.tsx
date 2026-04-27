// components/marketing/NewsletterListsSection.tsx
import { createClient } from '@/lib/supabase/server'
import type { NewsletterList } from '@/lib/types/database'
import EditListButton from './EditListButton'

type ListWithProject = NewsletterList & {
  project?: { id: string; name: string; emoji: string | null } | null
}

export default async function NewsletterListsSection() {
  const supabase = await createClient()

  const [listsRes, subsRes, projectsRes] = await Promise.all([
    supabase.from('newsletter_lists')
      .select('*, project:projects(id, name, emoji)')
      .order('name'),
    supabase.from('newsletter_subscriptions').select('list_name, unsubscribed_at'),
    supabase.from('projects').select('id, name, emoji').order('name'),
  ])

  const lists = (listsRes.data ?? []) as ListWithProject[]
  const projects = (projectsRes.data ?? []).map((p: any) => ({ id: p.id, name: p.name, emoji: p.emoji ?? null }))

  const counts = new Map<string, number>()
  for (const row of subsRes.data ?? []) {
    if (row.unsubscribed_at !== null) continue
    counts.set(row.list_name, (counts.get(row.list_name) ?? 0) + 1)
  }

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-[12px] uppercase tracking-widest" style={{ color: '#9AA5AC' }}>
          📋 Lists
          {lists.length > 0 && <span className="ml-2" style={{ color: '#CDC3AE' }}>· {lists.length}</span>}
        </h2>
        <EditListButton mode="create" projects={projects} label="+ New list" />
      </div>

      {lists.length === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center text-center"
          style={{ background: '#fff', border: '1px solid #E8E2D6', padding: 28 }}
        >
          <div className="text-3xl mb-2">📋</div>
          <p className="text-[13px] mb-3" style={{ color: '#6B7A82' }}>
            No newsletter lists yet — add one to start collecting subscribers.
          </p>
          <EditListButton mode="create" projects={projects} label="+ New list" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lists.map(list => {
            const active = counts.get(list.name) ?? 0
            return (
              <div
                key={list.id}
                className="rounded-xl"
                style={{
                  background: '#fff',
                  border: '1px solid #E8E2D6',
                  borderLeft: `3px solid ${list.brand_primary}`,
                  padding: 14,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={{ fontSize: 14, color: '#0D2035' }}>
                        {list.project?.emoji ?? '📋'} {list.name}
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 999,
                        background: '#E8F4F0', color: '#1E6B5E',
                      }}>
                        {active} active
                      </span>
                    </div>
                    {list.description && (
                      <p className="truncate" style={{ fontSize: 12, color: '#6B7A82', marginTop: 2 }}>
                        {list.description}
                      </p>
                    )}
                    <p style={{ fontSize: 11, color: '#9AA5AC', marginTop: 6 }}>
                      <strong style={{ fontWeight: 600, color: '#6B7A82' }}>From:</strong>{' '}
                      <code style={{ background: '#F5F0E8', padding: '1px 5px', borderRadius: 4 }}>
                        {list.from_name} &lt;{list.from_email}&gt;
                      </code>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      title="Brand primary"
                      style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: list.brand_primary,
                        border: '1px solid #E8E2D6',
                      }}
                    />
                    <span
                      title="Brand accent"
                      style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: list.brand_accent,
                        border: '1px solid #E8E2D6',
                      }}
                    />
                    <EditListButton mode="edit" list={list} projects={projects} label="Edit" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
