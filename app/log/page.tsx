import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import LogWinsClient from '@/components/log/LogWinsClient'

export default async function LogPage() {
  const supabase = await createClient()

  const [activitiesRes, winsRes, projectsRes] = await Promise.all([
    supabase
      .from('activity_log')
      .select('*, project:projects(name, emoji), actor:profiles(name)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('wins')
      .select('*, project:projects(id, name, emoji)')
      .order('happened_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, emoji')
      .order('name'),
  ])

  const activities = activitiesRes.data ?? []
  const wins = winsRes.data ?? []
  const projects = projectsRes.data ?? []

  return (
    <>
      <TopBar crumbs={['Log & Wins']} />
      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        <div className="mb-5">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E6B5E', letterSpacing: -0.5 }}
          >
            🏆 Log & Wins
          </h1>
          <p className="text-[12.5px] mt-1" style={{ color: '#6B7A82' }}>
            {wins.length} wins · {activities.length} activity entries
          </p>
        </div>
        <LogWinsClient activities={activities as any} wins={wins as any} projects={projects} />
      </div>
    </>
  )
}
