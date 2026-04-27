'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LifecycleStage, InterestLevel } from '@/lib/types/database'

const STAGES: { value: LifecycleStage; label: string; emoji: string; bg: string; color: string }[] = [
  { value: 'lead',      label: 'Lead',      emoji: '🎯', bg: '#FDF3E0', color: '#B7791F' },
  { value: 'qualified', label: 'Qualified', emoji: '🔬', bg: '#EDE9FE', color: '#5B21B6' },
  { value: 'customer',  label: 'Customer',  emoji: '🏆', bg: '#D1FAE5', color: '#065F46' },
  { value: 'past',      label: 'Past',      emoji: '📦', bg: '#F3F4F6', color: '#6B7280' },
]

const INTEREST: { value: InterestLevel; label: string; emoji: string }[] = [
  { value: 'hot',     label: 'Hot',     emoji: '🔥' },
  { value: 'warm',    label: 'Warm',    emoji: '👍' },
  { value: 'curious', label: 'Curious', emoji: '🤷' },
]

interface Props {
  contactId: string
  initialStage: LifecycleStage
  initialInterest: InterestLevel | null
}

export default function LifecycleStageEditor({ contactId, initialStage, initialInterest }: Props) {
  const router = useRouter()
  const [stage, setStage] = useState<LifecycleStage>(initialStage)
  const [interest, setInterest] = useState<InterestLevel | null>(initialInterest)
  const [saving, setSaving] = useState(false)

  async function patch(patch: Record<string, unknown>) {
    setSaving(true)
    const res = await fetch(`/api/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    if (res.ok) router.refresh()
  }

  async function handleStage(next: LifecycleStage) {
    setStage(next)
    await patch({ lifecycle_stage: next })
  }

  async function handleInterest(next: InterestLevel | null) {
    setInterest(next)
    await patch({ interest_level: next })
  }

  const showInterest = stage === 'lead' || stage === 'qualified'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9AA5AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Lifecycle stage
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STAGES.map(s => {
            const active = stage === s.value
            return (
              <button
                key={s.value}
                onClick={() => handleStage(s.value)}
                disabled={saving}
                style={{
                  fontSize: 12, fontWeight: 600,
                  padding: '5px 12px', borderRadius: 999,
                  border: `1px solid ${active ? s.color : '#E8E2D6'}`,
                  background: active ? s.bg : '#FFFFFF',
                  color: active ? s.color : '#6B7A82',
                  cursor: 'pointer',
                }}
              >
                {s.emoji} {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {showInterest && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9AA5AC', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
            Interest
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {INTEREST.map(i => {
              const active = interest === i.value
              return (
                <button
                  key={i.value}
                  onClick={() => handleInterest(active ? null : i.value)}
                  disabled={saving}
                  style={{
                    fontSize: 12, fontWeight: 600,
                    padding: '5px 12px', borderRadius: 999,
                    border: `1px solid ${active ? '#1E6B5E' : '#E8E2D6'}`,
                    background: active ? '#E8F4F0' : '#FFFFFF',
                    color: active ? '#1E6B5E' : '#6B7A82',
                    cursor: 'pointer',
                  }}
                >
                  {i.emoji} {i.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
