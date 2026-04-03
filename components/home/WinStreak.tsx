// components/home/WinStreak.tsx
'use client'
import Link from 'next/link'

interface Props {
  completedThisWeek: number
}

export default function WinStreak({ completedThisWeek }: Props) {
  return (
    <Link href="/log" className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm">
      <span className="text-xl">🏆</span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-gray-800">
          {completedThisWeek} task{completedThisWeek !== 1 ? 's' : ''} completed this week
        </div>
        <div className="text-xs text-gray-400">Tap to see your wins →</div>
      </div>
    </Link>
  )
}
