// components/projects/StageFilterPills.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const STAGES = [
  { value: 'all', label: 'All', icon: '' },
  { value: 'inbox', label: 'Inbox', icon: '📥' },
  { value: 'someday', label: 'Someday', icon: '💤' },
  { value: 'exploring', label: 'Exploring', icon: '🔍' },
  { value: 'building', label: 'Building', icon: '🔨' },
  { value: 'live', label: 'Live', icon: '🟢' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
]

interface Props {
  counts: Record<string, number>
}

export default function StageFilterPills({ counts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('stage') ?? 'all'

  function setStage(stage: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (stage === 'all') params.delete('stage')
    else params.set('stage', stage)
    router.push(`/projects?${params.toString()}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {STAGES.map(s => (
        <button
          key={s.value}
          onClick={() => setStage(s.value)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
            active === s.value
              ? 'bg-teal-700 text-white'
              : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          {s.icon && <span>{s.icon}</span>}
          <span>{s.label}</span>
          {counts[s.value] !== undefined && counts[s.value] > 0 && (
            <span className={`text-xs ${active === s.value ? 'opacity-80' : 'text-gray-400'}`}>
              {counts[s.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
