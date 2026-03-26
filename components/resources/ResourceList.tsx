'use client'

import { useState } from 'react'
import type { Resource, ResourceCategory } from '@/lib/types/database'

interface ResourceListProps {
  grouped: Record<ResourceCategory, Resource[]>
}

const categoryInfo: Record<ResourceCategory, { label: string; }> = {
  dev: { label: 'Dev & Deployment' },
  marketing: { label: 'Marketing & Content' },
  ai: { label: 'AI Tools' },
  business: { label: 'Business' },
  brand: { label: 'Brand' },
  contacts: { label: 'Contacts' },
}

const categoryOrder: ResourceCategory[] = ['dev', 'marketing', 'ai', 'business', 'brand', 'contacts']

export function ResourceList({ grouped }: ResourceListProps) {
  const [search, setSearch] = useState('')

  const filteredGrouped = Object.fromEntries(
    categoryOrder.map((cat) => [
      cat,
      (grouped[cat] ?? []).filter((r) =>
        !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
      ),
    ])
  ) as Record<ResourceCategory, Resource[]>

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources..."
          className="w-full px-3 py-2.5 rounded-lg border border-black/10 bg-white text-sm text-[#2C3E50] focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]"
        />
      </div>

      <div className="space-y-4">
        {categoryOrder.map((cat) => {
          const resources = filteredGrouped[cat]
          if (resources.length === 0) return null
          const info = categoryInfo[cat]

          return (
            <div key={cat}>
              <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2">
                {info.label}
              </div>
              <div className="bg-white rounded-xl border border-black/[0.08] overflow-hidden">
                {resources.map((resource, i) => (
                  <a
                    key={resource.id}
                    href={resource.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2.5 px-3.5 py-3 hover:bg-[#F5F0E8] transition-colors ${
                      i < resources.length - 1 ? 'border-b border-black/5' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center text-base flex-shrink-0">
                      {resource.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#2C3E50]">{resource.name}</div>
                      {resource.description && (
                        <div className="text-[11px] text-[#8899a6]">{resource.description}</div>
                      )}
                    </div>
                    <span className="text-[#ccc] text-xs">&nearr;</span>
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
