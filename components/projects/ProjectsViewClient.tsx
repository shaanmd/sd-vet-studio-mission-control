'use client'
import { useState, useEffect, useRef } from 'react'
import type { ProjectWithDetails } from '@/lib/types/database'
import ProjectsTable from './ProjectsTable'
import ProjectCard from './ProjectCard'

interface Props {
  projects: ProjectWithDetails[]
  revenueByProject: Record<string, number>
  ownerByProject: Record<string, 'Deb' | 'Shaan' | null>
  view: 'table' | 'grid'
  activeStage: string
}

export default function ProjectsViewClient({ projects, revenueByProject, ownerByProject, view, activeStage }: Props) {
  const [search, setSearch] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'Shaan' | 'Deb'>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘K focuses search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close filter popover on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [filterOpen])

  const q = search.trim().toLowerCase()
  const filtered = projects.filter(p => {
    if (q && !p.name.toLowerCase().includes(q) && !(p.summary ?? '').toLowerCase().includes(q)) return false
    if (ownerFilter !== 'all' && ownerByProject[p.id] !== ownerFilter) return false
    return true
  })

  const hasActiveFilter = ownerFilter !== 'all'

  return (
    <div>
      {/* Search + Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search input */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] flex-1"
          style={{ background: '#fff', border: `1px solid ${search ? '#1E6B5E' : '#E8E2D6'}`, maxWidth: 320 }}
        >
          <span style={{ color: '#CDC3AE' }}>◎</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="flex-1 bg-transparent outline-none text-[12.5px]"
            style={{ color: '#1E2A35' }}
          />
          {search ? (
            <button onClick={() => setSearch('')} style={{ color: '#9AA5AC', fontSize: 14, lineHeight: 1 }}>×</button>
          ) : (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F2ECE0', color: '#6B7A82' }}>⌘K</span>
          )}
        </div>

        {/* Filter popover */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
            style={{
              border: `1px solid ${hasActiveFilter ? '#1E6B5E' : '#D9D2C2'}`,
              background: hasActiveFilter ? '#E8F4F0' : '#fff',
              color: hasActiveFilter ? '#1E6B5E' : '#2A3A48',
            }}
          >
            Filter{hasActiveFilter ? ' ·' : ''}{ownerFilter !== 'all' ? ` ${ownerFilter}` : ''}
          </button>

          {filterOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl p-3 z-50 flex flex-col gap-3"
              style={{ background: '#fff', border: '1px solid #E8E2D6', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', minWidth: 180 }}
            >
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#9AA5AC' }}>Owner</div>
                <div className="flex gap-1.5">
                  {(['all', 'Shaan', 'Deb'] as const).map(o => (
                    <button
                      key={o}
                      onClick={() => setOwnerFilter(o)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                      style={ownerFilter === o
                        ? { background: '#1E6B5E', color: '#fff' }
                        : { background: '#F5F0E8', color: '#6B7A82' }}
                    >
                      {o === 'all' ? 'All' : o}
                    </button>
                  ))}
                </div>
              </div>
              {hasActiveFilter && (
                <button
                  onClick={() => { setOwnerFilter('all'); setFilterOpen(false) }}
                  className="text-[11px] text-left"
                  style={{ color: '#C0392B' }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results count when searching */}
      {q && (
        <p className="text-[12px] mb-3" style={{ color: '#9AA5AC' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
        </p>
      )}

      {/* Content */}
      {view === 'table' ? (
        <ProjectsTable
          projects={filtered}
          revenueByProject={revenueByProject}
          ownerByProject={ownerByProject}
        />
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {filtered.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              nextStep={project.next_step ?? null}
            />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-3 text-center py-8" style={{ color: '#9AA5AC' }}>
              {q ? 'No projects match your search.' : 'No projects in this stage.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
