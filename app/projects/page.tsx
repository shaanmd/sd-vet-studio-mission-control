import { createClient } from '@/lib/supabase/server'
import { getProjectsWithNextStep } from '@/lib/queries/projects'
import { getRevenueEntries } from '@/lib/queries/revenue'
import TopBar from '@/components/TopBar'
import ProjectsViewClient from '@/components/projects/ProjectsViewClient'
import ProjectsClientWrapper from '@/components/projects/ProjectsClientWrapper'
import type { Profile } from '@/lib/types/database'

const STAGE_ORDER = ['live', 'beta', 'building', 'exploring', 'someday', 'inbox', 'maintenance', 'archived']
const STAGE_LABELS: Record<string, string> = {
  live: 'live', beta: '🧪 beta', building: 'building', exploring: 'exploring', someday: 'someday', inbox: 'inbox', maintenance: 'maintenance', archived: '📦 archived',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; view?: string }>
}) {
  const params = await searchParams
  const activeStage = params.stage ?? 'all'
  const view = params.view ?? 'table'

  const supabase = await createClient()
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, name, role, avatar_url, slack_user_id, created_at')

  const allProfiles = (profileRows ?? []) as Profile[]

  const [projects, revenueEntries] = await Promise.all([
    getProjectsWithNextStep(),
    getRevenueEntries(),
  ])

  // Revenue totals per project
  const revenueByProject: Record<string, number> = {}
  for (const e of revenueEntries) {
    if (e.project_id) {
      revenueByProject[e.project_id] = (revenueByProject[e.project_id] ?? 0) + e.amount
    }
  }

  // Owner = who is assigned to the next_step task (assigned_to stores 'shaan'/'deb'/'both')
  const ownerByProject: Record<string, 'Deb' | 'Shaan' | null> = {}
  for (const p of projects) {
    const assignedTo = p.next_step?.assigned_to ?? null
    if (assignedTo === 'shaan') ownerByProject[p.id] = 'Shaan'
    else if (assignedTo === 'deb') ownerByProject[p.id] = 'Deb'
    else ownerByProject[p.id] = null
  }

  // Stage filter — archived hidden from "all" by default, pinned is a boolean flag
  const filtered = activeStage === 'all'
    ? projects.filter((p) => p.stage !== 'archived')
    : activeStage === 'pinned'
    ? projects.filter((p) => p.pinned)
    : projects.filter((p) => p.stage === activeStage)

  // Stage counts
  const counts: Record<string, number> = { all: projects.filter(p => p.stage !== 'archived').length }
  for (const p of projects) {
    counts[p.stage] = (counts[p.stage] ?? 0) + 1
  }

  // Sort: pinned first, then by STAGE_ORDER, then updated_at
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    const ai = STAGE_ORDER.indexOf(a.stage)
    const bi = STAGE_ORDER.indexOf(b.stage)
    if (ai !== bi) return ai - bi
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  // Active stages always show; others only if they have projects
  const ALWAYS_SHOW = new Set(['live', 'beta', 'building'])
  const activeStageLinks = ['live', 'beta', 'building', 'exploring', 'someday', 'inbox', 'archived']
    .filter(s => ALWAYS_SHOW.has(s) || counts[s])

  return (
    <>
      <TopBar
        crumbs={['Projects']}
        right={
          <div className="flex items-center gap-2">
            <ProjectsClientWrapper />
          </div>
        }
      />

      <div className="pb-24 md:pb-7" style={{ padding: '22px 28px' }}>
        {/* Heading row */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1
              className="font-bold leading-tight"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 26,
                color: '#1E6B5E',
                letterSpacing: -0.5,
              }}
            >
              Projects{' '}
              <span style={{ color: '#9AA5AC', fontWeight: 500 }}>· {projects.length}</span>
            </h1>
            <div className="flex items-center gap-1 flex-wrap mt-1 text-[12.5px]" style={{ color: '#6B7A82' }}>
              <a
                href={`/projects?stage=pinned${view !== 'table' ? `&view=${view}` : ''}`}
                className="hover:underline"
                style={{ color: activeStage === 'pinned' ? '#1E6B5E' : '#6B7A82', fontWeight: activeStage === 'pinned' ? 600 : 400 }}
              >
                📌 Pinned
              </a>
              {activeStageLinks.map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span style={{ color: '#CDC3AE' }}>·</span>
                  <a
                    href={`/projects?stage=${s}${view !== 'table' ? `&view=${view}` : ''}`}
                    className="hover:underline capitalize"
                    style={{ color: activeStage === s ? '#1E6B5E' : '#6B7A82', fontWeight: activeStage === s ? 600 : 400 }}
                  >
                    {STAGE_LABELS[s] ?? s}
                  </a>
                  {counts[s] ? <span style={{ color: '#9AA5AC' }}>({counts[s]})</span> : null}
                </span>
              ))}
            </div>
          </div>

          {/* Table / Grid / Board toggle */}
          <div
            className="flex p-1 rounded-lg"
            style={{ background: '#F5F0E8', border: '1px solid #E8E2D6' }}
          >
            {(['table', 'grid'] as const).map((v) => (
              <a
                key={v}
                href={`/projects?${activeStage !== 'all' ? `stage=${activeStage}&` : ''}view=${v}`}
                className="px-3 py-1.5 rounded-md text-[12.5px] font-semibold capitalize transition-colors"
                style={
                  view === v
                    ? { background: '#1E6B5E', color: '#fff' }
                    : { color: '#6B7A82' }
                }
              >
                {v === 'table' ? 'Table' : 'Grid'}
              </a>
            ))}
          </div>
        </div>

        <ProjectsViewClient
          projects={sorted}
          revenueByProject={revenueByProject}
          ownerByProject={ownerByProject}
          view={view as 'table' | 'grid'}
          activeStage={activeStage}
        />
      </div>
    </>
  )
}
