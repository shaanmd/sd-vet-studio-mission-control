// app/leads/page.tsx
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import LeadsClient from '@/components/leads/LeadsClient'

export default async function LeadsPage() {
  const supabase = await createClient()

  const [leadsRes, projectsRes] = await Promise.all([
    supabase
      .from('leads')
      .select('*, project:projects(name, emoji), added_by_profile:profiles!leads_added_by_fkey(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, emoji')
      .order('name'),
  ])

  const leads = leadsRes.data ?? []
  const projects = (projectsRes.data ?? []).map((p: any) => ({ id: p.id, name: p.name, emoji: p.emoji ?? '' }))

  return (
    <>
      <TopBar crumbs={['Leads']} />
      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        <div className="mb-5">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E6B5E', letterSpacing: -0.5 }}
          >
            🎯 Leads{' '}
            <span style={{ color: '#9AA5AC', fontWeight: 500 }}>· {leads.length}</span>
          </h1>
        </div>
        <LeadsClient leads={leads as any} projects={projects} />
      </div>
    </>
  )
}
