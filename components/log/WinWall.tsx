import type { ActivityLogWithDetails } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'
import Link from 'next/link'

interface WinWallProps {
  wins: ActivityLogWithDetails[]
}

export function WinWall({ wins }: WinWallProps) {
  if (wins.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-black/[0.08] p-8 text-center">
        <div className="text-4xl mb-3">{'\uD83C\uDFC6'}</div>
        <p className="text-sm text-[#8899a6]">Your wins will appear here. Go ship something!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {wins.map((win) => (
        <div key={win.id} className="bg-white rounded-xl border border-[#D4A853]/20 p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">{'\uD83C\uDF89'}</span>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#2C3E50]">{win.description}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[#8899a6]">
                {win.project && (
                  <Link href={`/projects/${win.project.id}`} className="text-[#1E6B5E] hover:underline">
                    {win.project.emoji} {win.project.name}
                  </Link>
                )}
                {win.actor && <span>&middot; {win.actor.name}</span>}
                <span>&middot; {formatDistanceToNow(win.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
