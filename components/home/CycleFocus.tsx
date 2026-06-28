'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CycleWithPhase, BetWithDetails, CheckinStatus, Project } from '@/lib/types/database'

const STATUS_STYLE: Record<CheckinStatus, { label: string; bg: string; color: string }> = {
  on_track: { label: 'On track', bg: '#D4F0EE', color: '#1E6B5E' },
  stuck:    { label: 'Stuck',    bg: '#FEF3C7', color: '#92400E' },
  done:     { label: 'Done',     bg: '#EFEAE0', color: '#6B7A82' },
}
const STATUS_ORDER: CheckinStatus[] = ['on_track', 'stuck', 'done']

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold uppercase tracking-[1.6px]" style={{ color: '#6B7A82' }}>
      {children}
    </div>
  )
}

function BetCard({ bet }: { bet: BetWithDetails }) {
  const router = useRouter()
  const [status, setStatus] = useState<CheckinStatus | null>(bet.latest_checkin?.status ?? null)
  const [note, setNote] = useState(bet.latest_checkin?.note ?? '')
  const [saving, setSaving] = useState(false)

  async function checkIn(next: CheckinStatus, noteValue: string) {
    setSaving(true)
    setStatus(next)
    await fetch(`/api/cycles/bets/${bet.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, note: noteValue }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl p-3.5" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="flex items-center gap-2.5 mb-1.5">
        <span className="text-xl leading-none">{bet.project?.emoji ?? '📁'}</span>
        <Link
          href={bet.project ? `/projects/${bet.project.id}` : '#'}
          className="flex-1 text-[14px] font-bold truncate hover:underline"
          style={{ color: '#0D2035' }}
        >
          {bet.project?.name ?? 'Project'}
        </Link>
        <span className="text-[11px] font-semibold shrink-0" style={{ color: '#9AA5AC' }}>
          {bet.owner === 'both' ? '👥' : bet.owner === 'shaan' ? 'S' : 'D'}
        </span>
      </div>

      <div className="text-[12.5px] mb-2.5" style={{ color: '#6B7A82' }}>
        🎯 {bet.goal_line}
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        {STATUS_ORDER.map((s) => {
          const st = STATUS_STYLE[s]
          const active = status === s
          return (
            <button
              key={s}
              type="button"
              disabled={saving}
              onClick={() => checkIn(s, note)}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: active ? st.bg : '#F5F0E8',
                color: active ? st.color : '#9AA5AC',
                border: active ? `1px solid ${st.color}33` : '1px solid transparent',
              }}
            >
              {st.label}
            </button>
          )
        })}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => status && checkIn(status, note)}
        placeholder="One-line update…"
        className="w-full text-[12.5px] px-2.5 py-1.5 rounded-lg outline-none"
        style={{ background: '#FBF7EF', border: '1px solid #EFEAE0', color: '#1E2A35' }}
      />
    </div>
  )
}

export default function CycleFocus({
  cycle,
  bets,
  parkingLot,
}: {
  cycle: CycleWithPhase | null
  bets: BetWithDetails[]
  parkingLot: Pick<Project, 'id' | 'name' | 'emoji' | 'stage'>[]
}) {
  const [showParking, setShowParking] = useState(false)

  // No cycle, or finished → prompt to start one.
  if (!cycle || cycle.phase === 'done' || cycle.phase === 'upcoming') {
    return (
      <div className="mb-5">
        <Link
          href="/cycle"
          className="block rounded-2xl p-4 text-center text-[13.5px] font-semibold transition-shadow hover:shadow-sm"
          style={{ background: '#fff', border: '1px dashed #CDC3AE', color: '#1E6B5E' }}
        >
          Start a cycle → focus on a few projects for the next 6 weeks
        </Link>
      </div>
    )
  }

  // Cooldown → calm banner.
  if (cycle.phase === 'cooldown') {
    return (
      <div className="mb-5">
        <div
          className="rounded-2xl p-4 flex items-center justify-between"
          style={{ background: '#E8F4F0', border: '1px solid #CDE6DF' }}
        >
          <div>
            <div className="text-[14px] font-bold" style={{ color: '#1E6B5E' }}>
              Cooldown · rest + small stuff 🛋️
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: '#6B7A82' }}>
              {cycle.name} wrapped. Next cycle starts when you bet again.
            </div>
          </div>
          <Link
            href="/cycle"
            className="px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-white shrink-0"
            style={{ background: '#1E6B5E' }}
          >
            Plan next →
          </Link>
        </div>
      </div>
    )
  }

  // Active.
  const pct = Math.min(100, Math.round(((cycle.totalWeeks * 7 - cycle.daysLeft) / (cycle.totalWeeks * 7)) * 100))
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <SectionLabel>
          {cycle.name} · Week {cycle.weekOf} of {cycle.totalWeeks} · {cycle.daysLeft} days left
        </SectionLabel>
        <Link href="/cycle" className="text-[11.5px] font-semibold" style={{ color: '#1E6B5E' }}>
          Manage →
        </Link>
      </div>

      <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: '#EFEAE0' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#1E6B5E' }} />
      </div>

      {bets.length === 0 ? (
        <Link
          href="/cycle"
          className="block rounded-xl p-4 text-center text-[13px]"
          style={{ background: '#fff', border: '1px dashed #CDC3AE', color: '#9AA5AC' }}
        >
          No bets yet — pick the projects you're focusing on →
        </Link>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}

      {parkingLot.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowParking((v) => !v)}
            className="text-[11.5px] font-semibold"
            style={{ color: '#9AA5AC' }}
          >
            🅿️ Parking Lot · {parkingLot.length} projects · not this cycle {showParking ? '▲' : '▼'}
          </button>
          {showParking && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {parkingLot.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="px-2.5 py-1 rounded-full text-[11.5px]"
                  style={{ background: '#F5F0E8', color: '#6B7A82', border: '1px solid #EFEAE0' }}
                >
                  {p.emoji} {p.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
