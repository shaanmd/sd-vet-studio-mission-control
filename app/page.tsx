// app/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getPinnedProjects } from '@/lib/queries/projects'
import { getNextStepTasks } from '@/lib/queries/personal-tasks'
import { getRevenueEntries } from '@/lib/queries/revenue'
import { getRevenueTotal, filterCurrentMonth } from '@/lib/finance'
import TopBar from '@/components/TopBar'
import YourNext3 from '@/components/home/YourNext3'
import FocusProjects from '@/components/home/FocusProjects'
import RevenueTiles from '@/components/home/RevenueTiles'
import FinancialGoal from '@/components/home/FinancialGoal'
import { Greeting } from '@/components/home/Greeting'
import type { Profile } from '@/lib/types/database'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_url, slack_user_id, created_at')

  const allProfiles = (profiles ?? []) as Profile[]
  const debProfile = allProfiles.find((p) => p.name === 'Deb')
  const shaanProfile = allProfiles.find((p) => p.name === 'Shaan')
  // Map email → display name (handles profiles where name was set to email)
  const shaanEmail = process.env.NEXT_PUBLIC_SHAAN_EMAIL ?? ''
  const debEmail   = process.env.NEXT_PUBLIC_DEB_EMAIL ?? ''
  const currentName =
    user.email === shaanEmail ? 'Shaan' :
    user.email === debEmail   ? 'Deb'   :
    debProfile?.id === user.id ? 'Deb' :
    shaanProfile?.id === user.id ? 'Shaan' :
    'there'

  const [nextTasks, pinnedProjects, revenueEntries, settingsRow] = await Promise.all([
    getNextStepTasks(),
    getPinnedProjects(),
    getRevenueEntries(),
    supabase.from('settings').select('value').eq('key', 'financial_goal').single(),
  ])

  const financialGoal = (settingsRow.data?.value as any) ?? null
  const ytdRevenue = getRevenueTotal(
    revenueEntries.filter(e => new Date((e as any).revenue_date ?? (e as any).created_at).getFullYear() === new Date().getFullYear())
  )

  return (
    <>
      <TopBar
        crumbs={['Home']}
        right={
          <div className="flex items-center gap-2">
            <Link
              href="/finance"
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors hover:bg-white/80"
              style={{ border: '1px solid #D9D2C2', background: '#fff', color: '#2A3A48' }}
            >
              + Log revenue
            </Link>
            <Link
              href="/finance"
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#1E6B5E' }}
            >
              + Log expense
            </Link>
          </div>
        }
      />

      <div className="pb-24 md:pb-7" style={{ padding: '24px 28px' }}>
        {/* Greeting strip */}
        <div className="flex items-end justify-between mb-5">
          <Greeting name={currentName} />
        </div>

        {/* Financial goal */}
        <FinancialGoal initialGoal={financialGoal} currentRevenue={ytdRevenue} />

        {/* Revenue tiles */}
        <RevenueTiles entries={revenueEntries} />

        {/* 2-col: money moves + focus projects */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
          <YourNext3
            tasks={nextTasks}
            profiles={allProfiles}
          />
          <FocusProjects projects={pinnedProjects} />
        </div>
      </div>
    </>
  )
}
