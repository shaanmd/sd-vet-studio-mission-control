'use client'

import { useState, type ReactNode } from 'react'

interface LogTabsProps {
  activityContent: ReactNode
  winContent: ReactNode
  winCount: number
}

export function LogTabs({ activityContent, winContent, winCount }: LogTabsProps) {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')

  return (
    <div>
      <div className="flex mb-4">
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold rounded-l-lg transition-colors ${
            tab === 'activity' ? 'bg-[#1E6B5E] text-white' : 'bg-white text-[#8899a6] border border-black/10'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab('wins')}
          className={`flex-1 py-2.5 text-center text-[13px] font-semibold rounded-r-lg transition-colors ${
            tab === 'wins' ? 'bg-[#D4A853] text-white' : 'bg-white text-[#8899a6] border border-black/10 border-l-0'
          }`}
        >
          Win Wall {winCount > 0 && `(${winCount})`}
        </button>
      </div>
      {tab === 'activity' ? activityContent : winContent}
    </div>
  )
}
