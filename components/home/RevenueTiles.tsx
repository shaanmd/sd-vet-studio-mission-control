// components/home/RevenueTiles.tsx
'use client'
import type { RevenueEntry } from '@/lib/types/database'
import { getRevenueTotal, filterCurrentMonth } from '@/lib/finance'

interface Props {
  entries: RevenueEntry[]
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(amount)
}

export default function RevenueTiles({ entries }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter(e => e.revenue_date === today)
  const monthEntries = filterCurrentMonth(entries, 'revenue_date')
  const inAppEntries = entries.filter(e => e.stream === 'inapp')
  const inAppMonth = filterCurrentMonth(inAppEntries, 'revenue_date')

  const tiles = [
    { label: 'Today', value: getRevenueTotal(todayEntries), accent: 'bg-teal-700' },
    { label: 'This Month', value: getRevenueTotal(monthEntries), accent: 'bg-amber-500' },
    { label: 'In-App / Tokens', value: getRevenueTotal(inAppMonth), accent: 'bg-teal-600' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {tiles.map(tile => (
        <div key={tile.label} className={`${tile.accent} rounded-xl p-3 text-white text-center`}>
          <div className="text-xs opacity-80 mb-1">{tile.label}</div>
          <div className="text-lg font-bold leading-tight">{formatCurrency(tile.value)}</div>
        </div>
      ))}
    </div>
  )
}
