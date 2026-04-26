'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

const WIN_TYPES = [
  { value: 'award',       label: '🏆 Award',       bg: '#FBF3DE', color: '#92400E', border: '#EFDDB0' },
  { value: 'milestone',   label: '🎯 Milestone',   bg: '#E8F4F0', color: '#1E6B5E', border: '#BFE3D8' },
  { value: 'launch',      label: '🚀 Launch',      bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' },
  { value: 'revenue',     label: '💰 Revenue',     bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  { value: 'partnership', label: '🤝 Partnership', bg: '#DBEAFE', color: '#1D4ED8', border: '#BFDBFE' },
  { value: 'feedback',    label: '💬 Feedback',    bg: '#FCE7F3', color: '#9D174D', border: '#FBCFE8' },
  { value: 'other',       label: '⭐ Other',       bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' },
] as const

type WinType = typeof WIN_TYPES[number]['value']

interface Win {
  id: string
  title: string
  description: string | null
  win_type: WinType
  happened_at: string
  project_id: string | null
  project: { id: string; name: string; emoji: string } | null
  created_at: string
}

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
  wins: Win[]
  projects: Array<{ id: string; name: string; emoji: string }>
}

function LogWinModal({ projects, onClose, onSaved }: {
  projects: Props['projects']
  onClose: () => void
  onSaved: (win: Win) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [winType, setWinType] = useState<WinType>('milestone')
  const [happenedAt, setHappenedAt] = useState(new Date().toISOString().slice(0, 10))
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, win_type: winType, happened_at: happenedAt, project_id: projectId || null }),
      })
      const data = await res.json()
      if (res.ok) { onSaved(data); onClose() }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
        <div className="px-6 pt-6 pb-2">
          <h2 className="font-bold text-[18px]" style={{ fontFamily: 'Georgia, serif', color: '#1E2A35' }}>Log a Win 🏆</h2>
          <p className="text-[12px] mt-0.5" style={{ color: '#9AA5AC' }}>Celebrate what you've shipped, earned, or achieved</p>
        </div>

        <div className="px-6 py-4 flex flex-col gap-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6B7A82' }}>What's the win?</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Won international hackathon"
              className="w-full rounded-lg px-3 py-2 text-[14px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
            />
          </div>

          {/* Type pills */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: '#6B7A82' }}>Type</label>
            <div className="flex flex-wrap gap-1.5">
              {WIN_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setWinType(t.value)}
                  className="px-2.5 py-1 rounded-full text-[12px] font-medium border transition-all"
                  style={winType === t.value
                    ? { background: t.bg, color: t.color, borderColor: t.border }
                    : { background: '#F5F0E8', color: '#9AA5AC', borderColor: '#E8E2D6' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date + Project row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6B7A82' }}>When</label>
              <input
                type="date"
                value={happenedAt}
                onChange={e => setHappenedAt(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6B7A82' }}>Project (optional)</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                style={{ borderColor: '#E8E2D6', color: projectId ? '#1E2A35' : '#9AA5AC' }}
              >
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#6B7A82' }}>Details (optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Any context worth remembering…"
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-[13px] border focus:outline-none focus:ring-2 focus:ring-teal-500/30 resize-none"
              style={{ borderColor: '#E8E2D6', color: '#1E2A35' }}
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px]" style={{ color: '#6B7A82' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: '#1E6B5E' }}
          >
            {saving ? 'Saving…' : '🏆 Log Win'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LogWinsClient({ activities, wins: initialWins, projects }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'wins' | 'activity'>('wins')
  const [wins, setWins] = useState<Win[]>(initialWins)
  const [showModal, setShowModal] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  // mount guard for portal
  if (!mounted && typeof window !== 'undefined') setMounted(true)

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

  async function handleDelete(id: string) {
    setWins(prev => prev.filter(w => w.id !== id))
    await fetch(`/api/wins/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  function handleSaved(win: Win) {
    setWins(prev => [win, ...prev])
    router.refresh()
  }

  return (
    <>
      {/* Tab toggle */}
      <div
        className="flex p-1 rounded-xl mb-5"
        style={{ background: '#F5F0E8', border: '1px solid #E8E2D6', width: 'fit-content' }}
      >
        {(['wins', 'activity'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold capitalize transition-colors"
            style={tab === t ? { background: '#1E6B5E', color: '#fff' } : { color: '#6B7A82' }}
          >
            {t === 'wins' ? '🏆 Win Wall' : 'Activity'}
          </button>
        ))}
      </div>

      {/* WIN WALL */}
      {tab === 'wins' && (
        <div>
          {/* Actions row */}
          <div className="flex items-center justify-between mb-4">
            <div />
            <div className="flex gap-2">
              {wins.length > 0 && (
                <button
                  onClick={handleGenerateSummary}
                  disabled={summaryLoading}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold disabled:opacity-50"
                  style={{ background: '#FBF3DE', color: '#B7791F', border: '1px solid #EFDDB0' }}
                >
                  {summaryLoading ? '✨ Generating…' : '✨ AI summary'}
                </button>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: '#1E6B5E' }}
              >
                + Log Win
              </button>
            </div>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <div className="rounded-xl p-4 mb-4" style={{ background: '#FBF3DE', border: '1px solid #EFDDB0' }}>
              <p className="text-[13px] leading-relaxed" style={{ color: '#92400E' }}>{aiSummary}</p>
              <button onClick={() => setAiSummary(null)} className="text-[11px] font-medium mt-2" style={{ color: '#B7791F' }}>Clear</button>
            </div>
          )}

          {/* Win list */}
          {wins.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-[48px] mb-3">🏆</div>
              <p className="text-[14px] font-semibold mb-1" style={{ color: '#1E2A35' }}>No wins logged yet</p>
              <p className="text-[13px] mb-4" style={{ color: '#9AA5AC' }}>Every big win starts with a first one — log it!</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: '#1E6B5E' }}
              >
                + Log your first win
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {wins.map(win => {
                const type = WIN_TYPES.find(t => t.value === win.win_type) ?? WIN_TYPES[1]
                return (
                  <div
                    key={win.id}
                    className="group rounded-xl px-4 py-3 flex items-start gap-3"
                    style={{ background: type.bg, border: `1px solid ${type.border}` }}
                  >
                    <span className="text-[20px] mt-0.5">{type.label.split(' ')[0]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold" style={{ color: '#1E2A35' }}>{win.title}</div>
                      {win.description && (
                        <div className="text-[12px] mt-0.5" style={{ color: '#6B7A82' }}>{win.description}</div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: '#9AA5AC' }}>
                        <span style={{ color: type.color, fontWeight: 600 }}>{type.label.split(' ').slice(1).join(' ')}</span>
                        {win.project && <><span>·</span><span>{win.project.emoji} {win.project.name}</span></>}
                        <span>·</span>
                        <span>{new Date(win.happened_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(win.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-2 py-0.5 rounded"
                      style={{ color: '#9AA5AC' }}
                      title="Remove win"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ACTIVITY FEED */}
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

      {/* Modal portal */}
      {mounted && showModal && createPortal(
        <LogWinModal projects={projects} onClose={() => setShowModal(false)} onSaved={handleSaved} />,
        document.body
      )}
    </>
  )
}
