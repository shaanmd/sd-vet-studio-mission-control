'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Project, Stage } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'
import StageFilter from './StageFilter'
import CreateProjectModal from './CreateProjectModal'
import StageTriage from './StageTriage'

interface ProjectListProps {
  projects: Project[]
  counts: Record<string, number>
}

const stageOrder: Stage[] = ['inbox', 'building', 'exploring', 'live', 'someday', 'maintenance']

const stageMeta: Record<Stage, { icon: string; label: string; color: string }> = {
  inbox: { icon: '\uD83D\uDCE5', label: 'Inbox', color: '#b45309' },
  building: { icon: '\uD83D\uDD28', label: 'Building', color: '#1E6B5E' },
  exploring: { icon: '\uD83D\uDD0D', label: 'Exploring', color: '#b45309' },
  live: { icon: '\uD83D\uDFE2', label: 'Live', color: '#059669' },
  someday: { icon: '\uD83D\uDCA4', label: 'Someday / Maybe', color: '#8899a6' },
  maintenance: { icon: '\uD83D\uDD27', label: 'Maintenance', color: '#6b7280' },
  archived: { icon: '\uD83D\uDDC4\uFE0F', label: 'Archived', color: '#9ca3af' },
}

export default function ProjectList({ projects, counts }: ProjectListProps) {
  const [filter, setFilter] = useState<Stage | 'all'>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [triaging, setTriaging] = useState<{ id: string; name: string } | null>(null)

  const filtered = useMemo(() => {
    let list = projects

    if (filter !== 'all') {
      list = list.filter((p) => p.stage === filter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.summary && p.summary.toLowerCase().includes(q))
      )
    }

    return list
  }, [projects, filter, search])

  // Group by stage in display order
  const grouped = useMemo(() => {
    const groups: { stage: Stage; items: Project[] }[] = []

    for (const stage of stageOrder) {
      const items = filtered.filter((p) => p.stage === stage)
      if (items.length > 0) {
        groups.push({ stage, items })
      }
    }

    return groups
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Search + New button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8899a6]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-black/8 bg-white text-[#2C3E50] placeholder:text-[#8899a6]/60 focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]/30 focus:border-[#1E6B5E]"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#1E6B5E' }}
        >
          + New
        </button>
      </div>

      {/* Stage filter pills */}
      <StageFilter activeFilter={filter} counts={counts} onFilter={setFilter} />

      {/* Project groups */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-xl border border-black/8 p-8 text-center">
          <p className="text-sm text-[#8899a6]">
            {search.trim() ? 'No projects match your search.' : 'No projects yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ stage, items }) => {
            const meta = stageMeta[stage]

            return (
              <section key={stage}>
                {/* Stage header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{meta.icon}</span>
                  <span
                    className="text-xs uppercase tracking-wider font-semibold"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      color: meta.color,
                      backgroundColor: `${meta.color}15`,
                    }}
                  >
                    {items.length}
                  </span>
                  {stage === 'inbox' && (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-white bg-[#b45309] px-2 py-0.5 rounded-full">
                      Needs Sorting
                    </span>
                  )}
                </div>

                {/* Project rows */}
                <div className="space-y-2">
                  {items.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center bg-white rounded-xl border border-black/8 hover:shadow-sm transition-shadow"
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        className="flex-1 flex items-center gap-3 p-3 min-w-0"
                      >
                        <span className="text-lg flex-shrink-0">
                          {project.emoji || '\uD83D\uDCC1'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[#2C3E50] truncate">
                            {project.name}
                          </p>
                          <p className="text-[11px] text-[#8899a6]">
                            {formatDistanceToNow(project.updated_at)}
                          </p>
                        </div>
                        <svg
                          className="w-4 h-4 text-[#8899a6] flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>

                      {stage === 'inbox' && (
                        <button
                          onClick={() =>
                            setTriaging({ id: project.id, name: project.name })
                          }
                          className="flex-shrink-0 mr-3 px-3 py-1 text-xs font-semibold rounded-lg transition-colors"
                          style={{ color: '#b45309', backgroundColor: '#b4530915' }}
                        >
                          Sort &rarr;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}

      {triaging && (
        <StageTriage
          projectId={triaging.id}
          projectName={triaging.name}
          onClose={() => setTriaging(null)}
          onSuccess={() => {
            setTriaging(null)
            // Trigger a page reload to get fresh data
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
