'use client'
import { useState } from 'react'

const ACTION_EMOJI: Record<string, string> = {
  task_completed: '✅',
  stage_changed: '🔄',
  deployed: '🚀',
  note_added: '📝',
  project_created: '✨',
  revenue_logged: '💰',
}

interface ActivityEntry {
  id: string
  action: string
  description: string
  created_at: string
  project: { name: string; emoji: string } | null
  actor: { name: string } | null
}

interface Props {
  activities: ActivityEntry[]
  wins: ActivityEntry[]
}

export default function LogWinsClient({ activities, wins }: Props) {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  async function handleGenerateSummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ai/win-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wins }),
      })
      const data = await res.json()
      setAiSummary(data.summary ?? null)
    } catch {
      setAiSummary('Could not generate summary. Try again.')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <>
      {/* Tab toggle */}
      <div
        className="flex p-1 rounded-xl mb-5"
        style={{ background: '#F5F0E8', border: '1px solid #E8E2D6', width: 'fit-content' }}
      >
        {(['activity', 'wins'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold capitalize transition-colors"
            style={
              tab === t
                ? { background: '#1E6B5E', color: '#fff' }
                : { color: '#6B7A82' }
            }
          >
            {t === 'wins' ? '🏆 Win Wall' : 'Activity'}
          </button>
        ))}
      </div>

      {/* Win AI summary */}
      {tab === 'wins' && wins.length > 0 && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: '#FBF3DE', border: '1px solid #EFDDB0' }}
        >
          {aiSummary ? (
            <>
              <p className="text-[13px] leading-relaxed" style={{ color: '#92400E' }}>{aiSummary}</p>
              <button onClick={() => setAiSummary(null)} className="text-[11px] font-medium mt-2" style={{ color: '#B7791F' }}>
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="w-full text-[13px] font-semibold disabled:opacity-50"
              style={{ color: '#B7791F' }}
            >
              {summaryLoading ? '✨ Generating celebration…' : '✨ Generate AI win summary'}
            </button>
          )}
        </div>
      )}

      {/* Activity feed */}
      {tab === 'activity' && (
        <div className="flex flex-col gap-2">
          {activities.length === 0 && (
            <p className="text-center py-8 text-[13px]" style={{ color: '#9AA5AC' }}>No activity yet — complete a task to see it here!</p>
          )}
          {activities.map(a => (
            <div
              key={a.id}
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#fff', border: '1px solid #E8E2D6' }}
            >
              <span className="text-[18px] mt-0.5">{ACTION_EMOJI[a.action] ?? '•'}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px]" style={{ color: '#1E2A35' }}>{a.description}</div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5 text-[11px]" style={{ color: '#9AA5AC' }}>
                  {a.project && <span>{a.project.emoji} {a.project.name}</span>}
                  {a.actor && <><span>·</span><span>{a.actor.name}</span></>}
                  <span>·</span>
                  <span>{new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Win wall */}
      {tab === 'wins' && (
        <div className="flex flex-col gap-2">
          {wins.length === 0 && (
            <div className="text-center py-12">
              <div className="text-[48px] mb-3">🏆</div>
              <p className="text-[13px]" style={{ color: '#9AA5AC' }}>Complete your first task and it'll show up here!</p>
            </div>
          )}
          {wins.map(win => {
            const isRevenue = win.action === 'revenue_logged'
            return (
              <div
                key={win.id}
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{
                  background: isRevenue ? '#FBF3DE' : '#E8F4F0',
                  border: `1px solid ${isRevenue ? '#EFDDB0' : '#BFE3D8'}`,
                }}
              >
                <span className="text-[18px] mt-0.5">
                  {win.action === 'revenue_logged' ? '💰' : win.action === 'stage_changed' ? '🚀' : '✅'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: '#1E2A35' }}>{win.description}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: '#9AA5AC' }}>
                    {win.project && <span>{win.project.emoji} {win.project.name}</span>}
                    <span>·</span>
                    <span>{new Date(win.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
