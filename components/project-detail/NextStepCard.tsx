// components/project-detail/NextStepCard.tsx
import type { Task } from '@/lib/types/database'

const ENERGY_LABEL: Record<string, string> = { high: '⚡ High energy', medium: '☕ Medium', low: '🛋️ Low energy' }

interface Props {
  task: Task | null
}

export default function NextStepCard({ task }: Props) {
  if (!task) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-600">
        No next step set — tap a task below and mark it as next step.
      </div>
    )
  }
  return (
    <div className="bg-amber-500 rounded-xl p-4 text-white">
      <div className="text-xs font-semibold opacity-80 mb-1 uppercase tracking-wide">→ Next Step</div>
      <div className="font-bold text-base mb-1">{task.title}</div>
      <div className="text-xs opacity-90">
        {ENERGY_LABEL[task.energy ?? 'medium']}
      </div>
    </div>
  )
}
