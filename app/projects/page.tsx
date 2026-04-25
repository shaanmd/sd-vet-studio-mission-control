import { createClient } from '@/lib/supabase/server'
import { getProjectsWithNextStep } from '@/lib/queries/projects'
import { getRevenueEntries } from '@/lib/queries/revenue'
import TopBar from '@/components/TopBar'
import ProjectsTable from '@/components/projects/ProjectsTable'
import ProjectCard from '@/components/projects/ProjectCard'
import ProjectsClientWrapper from '@/components/projects/ProjectsClientWrapper'
import type { Profile } from '@/lib/types/database'

const STAGE_ORDER = ['pinned', 'building', 'live', 'exploring', 'someday', 'inbox']

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

  // Map profile id → Deb | Shaan
  const profileNameById: Record<string, 'Deb' | 'Shaan'> = {}
  for (const p of allProfiles) {
    if (p.name === 'Deb' || p.name === 'Shaan') profileNameById[p.id] = p.name
  }

  // Owner = who is assigned to the next_step task
  const ownerByProject: Record<string, 'Deb' | 'Shaan' | null> = {}
  for (const p of projects) {
    const assignedTo = p.next_step?.assigned_to ?? null
    ownerByProject[p.id] = assignedTo ? (profileNameById[assignedTo] ?? null) : null
  }

  // Stage filter
  const filtered = activeStage === 'all'
    ? projects
    : projects.filter((p) => p.stage === activeStage)

  // Stage counts
  const counts: Record<string, number> = { all: projects.length }
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

  const stageLabels = ['building', 'live', 'exploring', 'someday', 'inbox']
    .filter((s) => counts[s])
    .join(' · ')

  return (
    <>
      <TopBar
        crumbs={['Projects']}
        right={
          <div className="flex items-center gap-2">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#9AA5AC', width: 240 }}
            >
              <span style={{ color: '#CDC3AE' }}>◎</span>
              <span className="flex-1">Search or type ⌘K…</span>
              <span
                className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: '#F2ECE0', color: '#6B7A82' }}
              >
                ⌘K
              </span>
            </div>
            {/* Filter */}
            <button
              className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
              style={{ border: '1px solid #D9D2C2', background: '#fff', color: '#2A3A48' }}
            >
              Filter
            </button>
            {/* New project */}
            <ProjectsClientWrapper />
          </div>
        }
      />

      <div className="flex-1 overflow-auto pb-24 md:pb-7" style={{ padding: '22px 28px' }}>
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
            <p className="text-[12.5px] mt-1" style={{ color: '#6B7A82' }}>
              📌 Pinned · {stageLabels}
            </p>
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

        {/* Content */}
        {view === 'table' ? (
          <ProjectsTable
            projects={sorted}
            revenueByProject={revenueByProject}
            ownerByProject={ownerByProject}
          />
        ) : (
          <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {sorted.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                nextStep={project.next_step ?? null}
              />
            ))}
            {sorted.length === 0 && (
              <p className="col-span-3 text-center py-8" style={{ color: '#9AA5AC' }}>
                No projects in this stage.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
