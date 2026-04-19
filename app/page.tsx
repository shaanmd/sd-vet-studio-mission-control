// app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getPinnedProjects } from '@/lib/queries/projects'
import { getPersonalTasks } from '@/lib/queries/personal-tasks'
import YourNext3 from '@/components/home/YourNext3'
import FocusProjects from '@/components/home/FocusProjects'
import type { Profile } from '@/lib/types/database'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch all profiles to find Deb and Shaan's IDs
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_url, slack_user_id, created_at')

  const allProfiles = (profiles ?? []) as Profile[]
  const debProfile = allProfiles.find((p) => p.name === 'Deb')
  const shaanProfile = allProfiles.find((p) => p.name === 'Shaan')

  // Fetch personal tasks and pinned projects in parallel
  const [debTasks, shaanTasks, pinnedProjects] = await Promise.all([
    debProfile ? getPersonalTasks(debProfile.id) : Promise.resolve([]),
    shaanProfile ? getPersonalTasks(shaanProfile.id) : Promise.resolve([]),
    getPinnedProjects(),
  ])

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1E6B5E' }}>SD VetStudio</h1>
        <p className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <YourNext3
        debTasks={debTasks}
        shaanTasks={shaanTasks}
        profiles={allProfiles}
      />

      <FocusProjects projects={pinnedProjects} />

      <div>
        <h2
          className="text-[11px] uppercase tracking-[2px] font-semibold mb-3"
          style={{ color: '#D4A853' }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <a
            href="/projects"
            className="bg-white rounded-xl p-3 text-center text-sm font-medium border border-black/8"
            style={{ color: '#1E6B5E' }}
          >
            + Add Idea
          </a>
          <a
            href="/projects"
            className="bg-white rounded-xl p-3 text-center text-sm font-medium text-gray-600 border border-black/8"
          >
            All Projects
          </a>
          <a
            href="/resources"
            className="bg-white rounded-xl p-3 text-center text-sm font-medium text-gray-600 border border-black/8"
          >
            Resources
          </a>
        </div>
      </div>
    </div>
  )
}
