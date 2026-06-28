'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CycleWithPhase, BetWithDetails, BetOwner, Project } from '@/lib/types/database'

type EligibleProject = Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>

export default function CycleManager({
  cycle,
  bets,
  eligibleProjects,
}: {
  cycle: CycleWithPhase | null
  bets: BetWithDetails[]
  eligibleProjects: EligibleProject[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [goal, setGoal] = useState('')
  const [owner, setOwner] = useState<BetOwner>('both')

  async function startCycle() {
    setBusy(true)
    await fetch('/api/cycles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    setBusy(false)
    router.refresh()
  }

  async function addBet() {
    if (!projectId || !goal.trim() || !cycle) return
    setBusy(true)
    await fetch(`/api/cycles/${cycle.id}/bets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, goal_line: goal, owner }),
    })
    setProjectId('')
    setGoal('')
    setBusy(false)
    router.refresh()
  }

  async function removeBet(betId: string) {
    if (!cycle) return
    setBusy(true)
    await fetch(`/api/cycles/${cycle.id}/bets/${betId}`, { method: 'DELETE' })
    setBusy(false)
    router.refresh()
  }

  if (!cycle) {
    return (
      <div className="max-w-xl">
        <h1 className="text-[22px] font-bold mb-2" style={{ color: '#0D2035', fontFamily: 'Georgia, serif' }}>
          No cycle running
        </h1>
        <p className="text-[13.5px] mb-4" style={{ color: '#6B7A82' }}>
          Start a 6-week cycle, then bet on the few projects you&apos;ll focus on. Everything else waits in the Parking Lot.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={startCycle}
          className="px-4 py-2 rounded-lg text-white text-[13.5px] font-semibold disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          Start a cycle →
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-[22px] font-bold mb-1" style={{ color: '#0D2035', fontFamily: 'Georgia, serif' }}>
        {cycle.name}
      </h1>
      <p className="text-[13px] mb-5" style={{ color: '#6B7A82' }}>
        {cycle.phase === 'active'
          ? `Week ${cycle.weekOf} of ${cycle.totalWeeks} · ${cycle.daysLeft} days left`
          : 'Cooldown'}{' '}
        · {cycle.starts_on} → {cycle.ends_on}
      </p>

      {/* Bets */}
      <div className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: '#6B7A82' }}>
        Your bets · {bets.length}
      </div>
      <div className="flex flex-col gap-2 mb-5">
        {bets.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: '#fff', border: '1px solid #E8E2D6' }}
          >
            <span className="text-lg">{b.project?.emoji ?? '📁'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold truncate" style={{ color: '#0D2035' }}>
                {b.project?.name ?? 'Project'}
              </div>
              <div className="text-[12px] truncate" style={{ color: '#6B7A82' }}>🎯 {b.goal_line}</div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => removeBet(b.id)}
              className="text-[12px] font-semibold disabled:opacity-50"
              style={{ color: '#9AA5AC' }}
            >
              Remove
            </button>
          </div>
        ))}
        {bets.length === 0 && (
          <div className="text-[13px] italic" style={{ color: '#9AA5AC' }}>No bets yet — add one below.</div>
        )}
      </div>

      {/* Add bet */}
      <div className="rounded-xl p-3.5" style={{ background: '#FBF7EF', border: '1px solid #EFEAE0' }}>
        <div className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: '#6B7A82' }}>
          Add a bet
        </div>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-full text-[13px] px-2.5 py-2 rounded-lg mb-2 outline-none"
          style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#1E2A35' }}
        >
          <option value="">Pick a project…</option>
          {eligibleProjects.map((p) => (
            <option key={p.id} value={p.id}>{p.emoji} {p.name} ({p.stage})</option>
          ))}
        </select>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="What does done look like?"
          className="w-full text-[13px] px-2.5 py-2 rounded-lg mb-2 outline-none"
          style={{ background: '#fff', border: '1px solid #E8E2D6', color: '#1E2A35' }}
        />
        <div className="flex items-center gap-2 mb-2">
          {(['shaan', 'deb', 'both'] as BetOwner[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOwner(o)}
              className="px-2.5 py-1 rounded-full text-[12px] font-semibold"
              style={{
                background: owner === o ? '#D4F0EE' : '#fff',
                color: owner === o ? '#1E6B5E' : '#9AA5AC',
                border: '1px solid #E8E2D6',
              }}
            >
              {o === 'both' ? '👥 Both' : o === 'shaan' ? 'Shaan' : 'Deb'}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy || !projectId || !goal.trim()}
          onClick={addBet}
          className="px-4 py-2 rounded-lg text-white text-[13px] font-semibold disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          Add bet
        </button>
      </div>

      {/* Check-in history */}
      {bets.some((b) => b.latest_checkin) && (
        <div className="mt-6">
          <div className="text-[10.5px] font-bold uppercase tracking-[1.6px] mb-2" style={{ color: '#6B7A82' }}>
            Latest check-ins
          </div>
          <div className="flex flex-col gap-1.5">
            {bets.filter((b) => b.latest_checkin).map((b) => (
              <div key={b.id} className="text-[12.5px]" style={{ color: '#6B7A82' }}>
                <span style={{ color: '#0D2035', fontWeight: 600 }}>{b.project?.name}</span>
                {' · '}{b.latest_checkin!.status.replace('_', ' ')}
                {b.latest_checkin!.note ? ` · "${b.latest_checkin!.note}"` : ''}
                {' · '}{b.latest_checkin!.checkin_date}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
