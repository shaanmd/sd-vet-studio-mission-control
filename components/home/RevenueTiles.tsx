'use client'
import type { RevenueEntry } from '@/lib/types/database'
import { getRevenueTotal, filterCurrentMonth, filterCurrentWeek } from '@/lib/finance'

interface Props {
  entries: RevenueEntry[]
}

function fmt(amount: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function RevenueTiles({ entries }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter((e) => e.revenue_date === today)
  const weekEntries = filterCurrentWeek(entries, 'revenue_date')
  const monthEntries = filterCurrentMonth(entries, 'revenue_date')

  const tiles = [
    { label: 'Today',      value: fmt(getRevenueTotal(todayEntries)),  accent: false },
    { label: 'This week',  value: fmt(getRevenueTotal(weekEntries)),   accent: false },
    { label: 'This month', value: fmt(getRevenueTotal(monthEntries)),  accent: true  },
  ]

  return (
    <div className="grid gap-3.5 mb-5" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.1fr' }}>
      {tiles.map((t) => (
        <div
          key={t.label}
          className="rounded-xl p-4"
          style={{ background: '#fff', border: '1px solid #E8E2D6' }}
        >
          <div
            className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2"
            style={{ color: '#6B7A82' }}
          >
            {t.label}
          </div>
          <div
            className="text-[26px] font-bold leading-none"
            style={{ color: t.accent ? '#1E6B5E' : '#0D2035', letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}
          >
            {t.value}
          </div>
        </div>
      ))}

      {/* Win streak tile */}
      <div
        className="rounded-xl p-4"
        style={{ background: '#FBF3DE', border: '1px solid #EFDDB0' }}
      >
        <div
          className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2"
          style={{ color: '#8A6A1E' }}
        >
          Win streak
        </div>
        <a
          href="/log"
          className="text-[13px] font-semibold block"
          style={{ color: '#D4A853' }}
        >
          View wins →
        </a>
      </div>
    </div>
  )
}
