import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import CycleManager from './CycleManager'
import { getCurrentCycle, getCycleBets } from '@/lib/queries/cycles'
import { getProjects } from '@/lib/queries/projects'

export default async function CyclePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const currentCycle = await getCurrentCycle()
  const isActive = !!currentCycle && (currentCycle.phase === 'active' || currentCycle.phase === 'cooldown')
  const bets = currentCycle && isActive ? await getCycleBets(currentCycle.id) : []
  const projects = await getProjects()
  const betProjectIds = new Set(bets.map((b) => b.project_id))
  const eligibleProjects = projects
    .filter((p) => ['live', 'beta', 'building', 'exploring'].includes(p.stage))
    .filter((p) => !betProjectIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, emoji: p.emoji, stage: p.stage }))

  return (
    <>
      <TopBar crumbs={['Cycle']} />
      <div className="pb-24 md:pb-7" style={{ padding: '24px 28px' }}>
        <CycleManager
          cycle={currentCycle && isActive ? currentCycle : null}
          bets={bets}
          eligibleProjects={eligibleProjects}
        />
      </div>
    </>
  )
}
