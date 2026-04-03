'use client'
import { useState } from 'react'
import type { RevenueEntry } from '@/lib/types/database'
import { getRevenueByStream } from '@/lib/finance'

const STREAM_LABELS: Record<string, string> = {
  course: '🎓 Course sales',
  subscription: '🔄 Subscriptions',
  inapp: '📱 In-app / tokens',
  consulting: '💼 Consulting',
  sponsorship: '🤝 Sponsorship',
  affiliate: '🔗 Affiliate',
  other: '📦 Other',
}

interface Props { entries: RevenueEntry[] }

export default function RevenueStreamBreakdown({ entries }: Props) {
  const [open, setOpen] = useState(false)
  const byStream = getRevenueByStream(entries)
  const sorted = Object.entries(byStream).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))

  return (
    <div className="bg-[#f9f5ef] rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>Revenue by stream</span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {sorted.map(([stream, total]) => (
            <div key={stream} className="flex justify-between text-sm">
              <span className="text-gray-600">{STREAM_LABELS[stream] ?? stream}</span>
              <span className="font-semibold text-gray-800">${(total ?? 0).toFixed(2)}</span>
            </div>
          ))}
          {sorted.length === 0 && <p className="text-gray-400 text-sm">No revenue logged.</p>}
        </div>
      )}
    </div>
  )
}
