import type { RevenueEntry } from '@/lib/types/database'

const STREAM_LABELS: Record<string, string> = {
  course: '🎓 Course',
  subscription: '🔄 Subscription',
  inapp: '📱 In-app',
  consulting: '💼 Consulting',
  sponsorship: '🤝 Sponsorship',
  affiliate: '🔗 Affiliate',
  other: '📦 Other',
}

interface RevenueWithProject extends RevenueEntry {
  project: { name: string; emoji: string } | null
}

interface Props { entries: RevenueWithProject[] }

export default function RevenueList({ entries }: Props) {
  if (entries.length === 0) {
    return <p className="text-center text-gray-400 py-6 text-sm">No revenue logged yet. Every dollar counts! 💰</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {entries.map(entry => (
        <div key={entry.id} className="bg-white rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-800 text-sm">{entry.description}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              <span>{STREAM_LABELS[entry.stream] ?? entry.stream}</span>
              {entry.project && <><span>·</span><span>{entry.project.emoji} {entry.project.name}</span></>}
              <span>·</span>
              <span>{new Date(entry.revenue_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <span className="font-bold text-teal-700 text-sm shrink-0">+${entry.amount.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}
