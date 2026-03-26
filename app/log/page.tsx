import { getActivityLog, getWins } from '@/lib/queries/activity'
import { ActivityFeed } from '@/components/log/ActivityFeed'
import { WinWall } from '@/components/log/WinWall'
import { LogTabs } from '@/components/log/LogTabs'

export default async function LogPage() {
  const [activity, wins] = await Promise.all([
    getActivityLog(),
    getWins(),
  ])

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Activity</h1>
      <LogTabs
        activityContent={<ActivityFeed entries={activity} />}
        winContent={<WinWall wins={wins} />}
        winCount={wins.length}
      />
    </div>
  )
}
