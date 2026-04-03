import type { ActivityLogEntry } from '@/lib/types/database'

interface ActivityWithRelations extends ActivityLogEntry {
  project: { name: string; emoji: string } | null
  actor: { name: string } | null
}

interface Props { wins: ActivityWithRelations[] }

export default function WinWall({ wins }: Props) {
  if (wins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-gray-400 text-sm">Complete your first task and it'll show up here! 🎉</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {wins.map(win => (
        <div key={win.id} className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
          win.action === 'revenue_logged' ? 'bg-amber-50 border border-amber-100' : 'bg-teal-50 border border-teal-100'
        }`}>
          <span className="text-lg mt-0.5">
            {win.action === 'revenue_logged' ? '💰' : win.action === 'stage_changed' ? '🚀' : '✅'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800">{win.description}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
              {win.project && <span>{win.project.emoji} {win.project.name}</span>}
              <span>·</span>
              <span>{new Date(win.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
