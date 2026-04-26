'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectType, PulseTileValue } from '@/lib/types/database'

// ── Tile definitions ────────────────────────────────────────────────────────

type TileUnit = 'currency' | 'percent' | 'number' | 'days'
type TileSource = 'teachable' | 'convertkit' | 'stripe' | 'manual'

interface PulseTileDef {
  id: string
  label: string
  sub?: string
  unit?: TileUnit
  source: TileSource
}

const TILE_DEFS: Record<NonNullable<ProjectType> | 'other', PulseTileDef[]> = {
  website_build: [
    { id: 'monthly_visitors', label: 'Monthly visitors', unit: 'number', source: 'manual' },
    { id: 'top_page', label: 'Top page', unit: 'number', source: 'manual' },
    { id: 'email_list', label: 'Email list', unit: 'number', source: 'manual' },
    { id: 'last_post_days', label: 'Last post', sub: 'days ago', unit: 'days', source: 'manual' },
  ],
  saas: [
    { id: 'mrr', label: 'MRR', unit: 'currency', source: 'manual' },
    { id: 'active_subs', label: 'Active subs', unit: 'number', source: 'manual' },
    { id: 'churn_30d', label: 'Churn 30d', unit: 'percent', source: 'manual' },
    { id: 'trial_to_paid', label: 'Trial→paid', unit: 'percent', source: 'manual' },
  ],
  course: [
    { id: 'enrolled', label: 'Enrolled students', unit: 'number', source: 'manual' },
    { id: 'completion', label: 'Completion rate', unit: 'percent', source: 'manual' },
    { id: 'email_list', label: 'Email list', unit: 'number', source: 'manual' },
    { id: 'nps', label: 'NPS', unit: 'number', source: 'manual' },
  ],
  consulting: [
    { id: 'contract_value', label: 'Contract value', unit: 'currency', source: 'manual' },
    { id: 'days_to_delivery', label: 'Days to delivery', unit: 'days', source: 'manual' },
    { id: 'gates_complete', label: 'Gates complete', unit: 'number', source: 'manual' },
    { id: 'hours_logged', label: 'Hours logged', unit: 'number', source: 'manual' },
  ],
  other: [
    { id: 'metric_1', label: 'Metric 1', unit: 'number', source: 'manual' },
    { id: 'metric_2', label: 'Metric 2', unit: 'number', source: 'manual' },
    { id: 'metric_3', label: 'Metric 3', unit: 'number', source: 'manual' },
    { id: 'metric_4', label: 'Metric 4', unit: 'number', source: 'manual' },
  ],
}

// ── Source tag styles ────────────────────────────────────────────────────────

interface SourceStyle {
  bg: string
  text: string
  dotColor?: string
  icon?: string
}

const SOURCE_STYLES: Record<TileSource, SourceStyle> = {
  manual:     { bg: '#F5F0E8', text: '#9AA5AC', icon: '✎' },
  teachable:  { bg: '#E8F5E9', text: '#2E7D32', dotColor: '#4CAF50' },
  convertkit: { bg: '#FFF3ED', text: '#C75200', dotColor: '#FF6B35' },
  stripe:     { bg: '#F0EFFF', text: '#3730A3', dotColor: '#635BFF' },
}

// ── Value formatter ──────────────────────────────────────────────────────────

function formatValue(value: number | null, unit?: TileUnit): string {
  if (value === null) return '—'
  switch (unit) {
    case 'currency': return `$${value.toLocaleString()}`
    case 'percent':  return `${value}%`
    case 'days':     return `${value}d`
    default:         return value.toLocaleString()
  }
}

// ── SourceTag (extracted static component) ───────────────────────────────────

function SourceTag({ source }: { source: TileSource }) {
  const s = SOURCE_STYLES[source]
  return (
    <span
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: s.bg, color: s.text }}
    >
      {s.dotColor ? (
        <span
          className="inline-block rounded-full shrink-0"
          style={{ width: 6, height: 6, background: s.dotColor }}
        />
      ) : (
        <span>{s.icon}</span>
      )}
      {source === 'manual' ? 'Manual' : source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  )
}

// ── PulseTile ────────────────────────────────────────────────────────────────

interface PulseTileProps {
  def: PulseTileDef
  currentValue: number | null
  projectId: string
  onSaved: (tileId: string, value: number | null) => void
}

function PulseTile({ def, currentValue, projectId, onSaved }: PulseTileProps) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  const handleClickValue = useCallback(() => {
    setInputVal(currentValue !== null ? String(currentValue) : '')
    setEditing(true)
  }, [currentValue])

  const handleSave = useCallback(async () => {
    setSaving(true)
    const parsed = inputVal.trim() === '' ? null : Number(inputVal)
    try {
      await fetch(`/api/projects/${projectId}/pulse`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tile_id: def.id, value: parsed }),
      })
      onSaved(def.id, parsed)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }, [inputVal, projectId, def.id, onSaved])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSave()
      if (e.key === 'Escape') setEditing(false)
    },
    [handleSave],
  )

  return (
    <div
      className="rounded-xl p-4 bg-white flex flex-col gap-1"
      style={{ border: '1px solid #E8E2D6' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-1">
        <span
          className="uppercase tracking-wide"
          style={{ fontSize: 11, fontWeight: 600, color: '#9AA5AC' }}
        >
          {def.label}
        </span>
        <SourceTag source={def.source} />
      </div>

      {/* Value */}
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="w-full rounded-lg border px-2 py-1 text-[18px] font-bold"
            style={{ borderColor: '#1E6B5E', color: '#0D2035', outline: 'none' }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-white"
            style={{ background: '#1E6B5E' }}
          >
            {saving ? '…' : 'Save'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClickValue}
          className="text-left group"
          title="Click to edit"
        >
          <span
            className="group-hover:opacity-70 transition-opacity"
            style={{ fontSize: 28, fontWeight: 700, color: '#0D2035', lineHeight: 1 }}
          >
            {formatValue(currentValue, def.unit)}
          </span>
        </button>
      )}

      {/* Sub text */}
      {def.sub && (
        <span style={{ fontSize: 12, color: '#6B7A82', marginTop: 2 }}>{def.sub}</span>
      )}
    </div>
  )
}

// ── PulseStrip ───────────────────────────────────────────────────────────────

interface PulseStripProps {
  projectId: string
  projectType: ProjectType | null
  pulseValues: PulseTileValue[]
}

export default function PulseStrip({ projectId, projectType, pulseValues }: PulseStripProps) {
  const router = useRouter()

  // Local optimistic values — seeded from props
  const [localValues, setLocalValues] = useState<Record<string, number | null>>(() => {
    const map: Record<string, number | null> = {}
    for (const pv of pulseValues) {
      map[pv.tile_id] = pv.value
    }
    return map
  })

  const tileDefs = TILE_DEFS[projectType ?? 'other']

  const handleSaved = useCallback((tileId: string, value: number | null) => {
    setLocalValues((prev) => ({ ...prev, [tileId]: value }))
    router.refresh()
  }, [router])

  return (
    <div className="mb-5 grid grid-cols-4 gap-3">
      {tileDefs.map((def) => (
        <PulseTile
          key={def.id}
          def={def}
          currentValue={localValues[def.id] ?? null}
          projectId={projectId}
          onSaved={handleSaved}
        />
      ))}
    </div>
  )
}
