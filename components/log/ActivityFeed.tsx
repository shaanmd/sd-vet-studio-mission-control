import type { ActivityLogEntry } from '@/lib/types/database'

const ACTION_EMOJI: Record<string, string> = {
  task_completed: '✅',
  stage_changed: '🔄',
  deployed: '🚀',
  note_added: '📝',
  project_created: '✨',
  revenue_logged: '💰',
  default: '•',
}

interface ActivityWithRelations extends ActivityLogEntry {
  project: { name: string; emoji: string } | null
  actor: { name: string } | null
}

interface Props { activities: ActivityWithRelations[] }

export default function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return <p className="text-center text-gray-400 py-8 text-sm">No activity yet — complete a task to see it here!</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {activities.map(activity => (
        <div key={activity.id} className="bg-white rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-lg mt-0.5">{ACTION_EMOJI[activity.action] ?? ACTION_EMOJI.default}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-800">{activity.description}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              {activity.project && <span>{activity.project.emoji} {activity.project.name}</span>}
              {activity.actor && <><span>·</span><span>{activity.actor.name}</span></>}
              <span>·</span>
              <span>{new Date(activity.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
