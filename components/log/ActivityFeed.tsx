import type { ActivityLogWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'
import Link from 'next/link'

interface ActivityFeedProps {
  entries: ActivityLogWithDetails[]
}

const actionIcons: Record<string, string> = {
  task_completed: '\u2705',
  note_added: '\uD83D\uDCDD',
  stage_changed: '\uD83D\uDD04',
  deployed: '\uD83D\uDE80',
  project_created: '\u2728',
  project_pinned: '\u2B50',
}

export function ActivityFeed({ entries }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-black/[0.08] p-8 text-center">
        <p className="text-sm text-[#8899a6]">Nothing here yet — complete your first task and it&apos;ll show up here!</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] overflow-hidden">
      {entries.map((entry, i) => (
        <div key={entry.id} className={`flex items-start gap-2.5 px-3.5 py-3 ${i < entries.length - 1 ? 'border-b border-black/5' : ''}`}>
          <span className="text-base mt-0.5">{actionIcons[entry.action] ?? '\uD83D\uDCCB'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-[#2C3E50]">{entry.description}</div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8899a6]">
              {entry.project && (
                <Link href={`/projects/${entry.project.id}`} className="text-[#1E6B5E] hover:underline">
                  {entry.project.emoji} {entry.project.name}
                </Link>
              )}
              {entry.actor && <span>&middot; {entry.actor.name}</span>}
              <span>&middot; {formatDistanceToNow(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
