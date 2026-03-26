import { createClient } from '@/lib/supabase/server'
import { getPinnedProjects } from '@/lib/queries/projects'
import { getPersonalTasks } from '@/lib/queries/personal-tasks'
import YourNext3 from '@/components/home/YourNext3'
import FocusProjects from '@/components/home/FocusProjects'
import QuickActions from '@/components/home/QuickActions'
import type { Profile } from '@/lib/types/database'

export default async function Home() {
  const today = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const supabase = await createClient()

  // Fetch profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')

  const allProfiles = (profiles ?? []) as Profile[]
  const debProfile = allProfiles.find((p) => p.name === 'Deb')
  const shaanProfile = allProfiles.find((p) => p.name === 'Shaan')

  // Fetch data in parallel
  const [pinnedProjects, debTasks, shaanTasks] = await Promise.all([
    getPinnedProjects(),
    debProfile ? getPersonalTasks(debProfile.id) : Promise.resolve([]),
    shaanProfile ? getPersonalTasks(shaanProfile.id) : Promise.resolve([]),
  ])

  return (
    <div className="max-w-lg mx-auto md:max-w-2xl p-5">
      <div className="md:hidden mb-1">
        <p className="text-xs uppercase tracking-wider text-[#2C3E50]">SD VetStudio</p>
      </div>
      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2C3E50]">
          <span className="hidden md:inline">Home</span>
          <span className="md:hidden">Mission Control</span>
        </h1>
        <p className="text-xs text-[#8899a6]">{today}</p>
      </div>

      <div className="space-y-8">
        <YourNext3
          debTasks={debTasks}
          shaanTasks={shaanTasks}
          profiles={allProfiles}
        />
        <FocusProjects projects={pinnedProjects} />
        <QuickActions />
      </div>
    </div>
  )
}
