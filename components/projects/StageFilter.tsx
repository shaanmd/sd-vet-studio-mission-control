'use client'

import type { Stage } from '@/lib/types/database'

interface StageFilterProps {
  activeFilter: Stage | 'all'
  counts: Record<string, number>
  onFilter: (stage: Stage | 'all') => void
}

const stages: { key: Stage | 'all'; label: string; icon: string }[] = [
  { key: 'live', label: 'Live', icon: '\uD83D\uDFE2' },
  { key: 'building', label: 'Building', icon: '\uD83D\uDD28' },
  { key: 'exploring', label: 'Exploring', icon: '\uD83D\uDD0D' },
  { key: 'someday', label: 'Someday', icon: '\uD83D\uDCA4' },
  { key: 'inbox', label: 'Inbox', icon: '\uD83D\uDCE5' },
  { key: 'all', label: 'All', icon: '' },
  { key: 'maintenance', label: 'Maintenance', icon: '\uD83D\uDD27' },
]

export default function StageFilter({ activeFilter, counts, onFilter }: StageFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {stages.map(({ key, label, icon }) => {
        const isActive = activeFilter === key
        const count = counts[key] ?? 0

        return (
          <button
            key={key}
            onClick={() => onFilter(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? 'bg-[#2C3E50] text-white'
                : 'bg-white text-[#8899a6] border border-black/8'
            }`}
          >
            {icon ? `${icon} ` : ''}{label} ({count})
          </button>
        )
      })}
    </div>
  )
}
