'use client'

import { useState, useTransition } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import type { NextStepTask } from '@/lib/queries/personal-tasks'
import type { Profile } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

interface YourNext3Props {
  debTasks: NextStepTask[]
  shaanTasks: NextStepTask[]
  profiles: Profile[]
}

const ENERGY_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  high: { bg: '#FDECEA', color: '#B23A2E', label: '⚡ high' },
  med:  { bg: '#FDF3E0', color: '#8A5A1E', label: '☕ med'  },
  low:  { bg: '#EAF3F0', color: '#3B6B5E', label: '🛋 low'  },
}

export default function YourNext3({ debTasks, shaanTasks, profiles }: YourNext3Props) {
  const { profile } = useAuth()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultTab = profile?.name === 'Shaan' ? 'Shaan' : 'Deb'
  const [activeTab, setActiveTab] = useState<'Deb' | 'Shaan'>(defaultTab)

  const tasks = activeTab === 'Deb' ? debTasks : shaanTasks

  function handleComplete(id: string) {
    startTransition(async () => {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, completed_at: new Date().toISOString() }),
      })
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      {/* Header */}
      <div
        className="flex items-start justify-between px-[18px] py-3.5"
        style={{ borderBottom: '1px solid #EFEAE0' }}
      >
        <div>
          <div
            className="text-[10.5px] font-bold uppercase tracking-[1.6px]"
            style={{ color: '#6B7A82' }}
          >
            Your next money moves
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: '#9AA5AC' }}>
            Drag to reorder · click to complete
          </div>
        </div>
        {/* Deb / Shaan toggle */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ background: '#F5F0E8', border: '1px solid #E8E2D6' }}
        >
          {(['Deb', 'Shaan'] as const).map((name) => (
            <button
              key={name}
              onClick={() => setActiveTab(name)}
              className="px-3 py-1 rounded-lg text-[12px] font-semibold transition-colors"
              style={
                activeTab === name
                  ? { background: '#1E6B5E', color: '#fff' }
                  : { color: '#6B7A82' }
              }
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Task rows */}
      {tasks.length === 0 ? (
        <div className="px-[18px] py-8 text-center text-[13px]" style={{ color: '#9AA5AC' }}>
          No 🔥 tasks yet — open a project and mark a task as next step.
        </div>
      ) : (
        tasks.map((task, i) => {
          const isTop = i === 0
          const energy = task.energy ?? 'med'
          const es = ENERGY_STYLES[energy] ?? ENERGY_STYLES.med

          return (
            <div
              key={task.id}
              className="flex items-center gap-3.5 px-[18px] py-3.5"
              style={{
                background: isTop ? '#FBF3DE' : 'transparent',
                borderBottom: i < tasks.length - 1 ? '1px solid #EFEAE0' : 'none',
              }}
            >
              {/* Number badge */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={
                  isTop
                    ? { background: '#D4A853', color: '#fff' }
                    : { background: '#F2ECE0', color: '#6B7A82' }
                }
              >
                {i + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold mb-1" style={{ color: '#0D2035' }}>
                  {task.title}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {task.project ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: '#E8F1EE', color: '#1E6B5E' }}
                    >
                      {task.project.emoji && `${task.project.emoji} `}{task.project.name}
                    </span>
                  ) : (
                    <span className="text-[11px] italic" style={{ color: '#9AA5AC' }}>no project</span>
                  )}
                </div>
              </div>

              {/* Energy pill */}
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0"
                style={{ background: es.bg, color: es.color }}
              >
                {es.label}
              </span>

              {/* Complete button */}
              <button
                onClick={() => handleComplete(task.id)}
                disabled={isPending}
                className="w-5 h-5 rounded-full border-2 shrink-0 transition-colors hover:bg-[#1E6B5E]/10 disabled:opacity-40"
                style={{ borderColor: '#CDC3AE' }}
                aria-label={`Complete "${task.title}"`}
              />
            </div>
          )
        })
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-[18px] py-3"
        style={{ borderTop: tasks.length > 0 ? '1px solid #EFEAE0' : 'none' }}
      >
        <span className="text-[12.5px]" style={{ color: '#9AA5AC' }}>
          Fire-flagged tasks per project
        </span>
        <a href="/projects" className="text-[12.5px] font-semibold" style={{ color: '#1E6B5E' }}>
          See all tasks →
        </a>
      </div>
    </div>
  )
}
