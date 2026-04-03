import type { RevenueEntry } from '@/lib/types/database'
import { getRevenueTotal, filterCurrentMonth } from '@/lib/finance'

function fmt(n: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n)
}

interface Props { entries: RevenueEntry[] }

export default function RevenueSummaryBar({ entries }: Props) {
  const monthEntries = filterCurrentMonth(entries, 'revenue_date')
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="bg-teal-50 text-teal-700 rounded-full px-3 py-1.5 text-sm font-semibold">
        {fmt(getRevenueTotal(monthEntries))} this month
      </div>
      <div className="bg-amber-50 text-amber-700 rounded-full px-3 py-1.5 text-sm">
        All time: {fmt(getRevenueTotal(entries))}
      </div>
    </div>
  )
}
