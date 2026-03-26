import type { GitHubCache } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

const DEPLOY_ICONS: Record<string, string> = {
  ready: '\u2713',
  building: '\uD83D\uDD04',
  error: '\u26A0\uFE0F',
}

export default function AutoStatus({ cache }: { cache: GitHubCache | null }) {
  if (!cache) return null

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] p-4 mb-4">
      <h2 className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-3">
        Auto Status
      </h2>
      <div className="flex flex-wrap gap-4 text-sm text-[#2C3E50]">
        {cache.last_commit_at && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#8899a6] text-xs">Last commit</span>
            <span className="font-medium">{formatDistanceToNow(cache.last_commit_at)}</span>
          </div>
        )}
        {cache.deploy_status && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#8899a6] text-xs">Deploy</span>
            <span className="font-medium">
              {DEPLOY_ICONS[cache.deploy_status] ?? ''} {cache.deploy_status}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[#8899a6] text-xs">Open PRs</span>
          <span className="font-medium">{cache.open_prs}</span>
        </div>
      </div>
    </div>
  )
}
