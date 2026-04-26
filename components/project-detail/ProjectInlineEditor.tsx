'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Project } from '@/lib/types/database'

const STAGES = [
  { value: 'live', label: '🟢 Live' },
  { value: 'beta', label: '🧪 Beta' },
  { value: 'building', label: '🔨 Building' },
  { value: 'exploring', label: '🔍 Exploring' },
  { value: 'someday', label: '💤 Someday' },
  { value: 'inbox', label: '📥 Inbox' },
  { value: 'maintenance', label: '🔧 Maintenance' },
  { value: 'archived', label: '📦 Archived' },
] as const

const STAGE_STYLE: Record<string, { bg: string; color: string }> = {
  live:        { bg: '#D1FAE5', color: '#065F46' },
  beta:        { bg: '#FDE8F7', color: '#8B2EB0' },
  building:    { bg: '#E8F4F0', color: '#1E6B5E' },
  exploring:   { bg: '#EDE9FE', color: '#5B21B6' },
  someday:     { bg: '#F3F4F6', color: '#6B7280' },
  inbox:       { bg: '#FEF3C7', color: '#92400E' },
  maintenance: { bg: '#EFEAE0', color: '#6B7A82' },
  archived:    { bg: '#F3F4F6', color: '#9AA5AC' },
}

const OWNERS = [
  { value: 'shaan', label: '👩‍💻 Shaan' },
  { value: 'deb', label: '👩‍⚕️ Deb' },
  { value: 'both', label: '👥 Both' },
] as const

interface Props {
  project: Project
  revenueTotal: number
  expenseTotal: number
  pnl: number
}

export default function ProjectInlineEditor({ project, revenueTotal, expenseTotal, pnl }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [pinned, setPinned] = useState(project.pinned)

  async function togglePin() {
    const next = !pinned
    setPinned(next)
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: next }),
    })
    router.refresh()
  }

  // Local editable state
  const [emoji, setEmoji] = useState(project.emoji ?? '')
  const [name, setName] = useState(project.name)
  const [stage, setStage] = useState(project.stage)
  const [summary, setSummary] = useState(project.summary ?? '')
  const [owner, setOwner] = useState<string>(project.owner ?? 'both')

  // Which fields are being edited
  const [editingName, setEditingName] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)

  async function save(patch: Record<string, unknown>) {
    setSaving(true)
    await fetch(`/api/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    setSaving(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "${project.name}"? This cannot be undone.`)) return
    await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    router.push('/projects')
  }

  async function handleArchive() {
    await save({ stage: 'archived' })
    router.push('/projects')
  }

  const stageStyle = STAGE_STYLE[stage] ?? STAGE_STYLE.inbox
  const stageLabel = STAGES.find(s => s.value === stage)?.label ?? stage

  return (
    <div className="flex items-start gap-4 mb-4">
      {/* Emoji — click to edit */}
      <button
        onClick={() => {
          const e = prompt('Change emoji:', emoji)
          if (e !== null) { setEmoji(e); save({ emoji: e || null }) }
        }}
        className="shrink-0 hover:opacity-70 transition-opacity"
        style={{ fontSize: 48, lineHeight: 1 }}
        title="Click to change emoji"
      >
        {emoji || '📁'}
      </button>

      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={() => { setEditingName(false); save({ name: name.trim() || project.name }) }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setEditingName(false); save({ name: name.trim() || project.name }) }
                if (e.key === 'Escape') { setName(project.name); setEditingName(false) }
              }}
              className="font-bold rounded-lg px-2 py-0.5 border border-teal-400 focus:outline-none"
              style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E2A35', letterSpacing: -0.5 }}
            />
          ) : (
            <h1
              className="font-bold leading-tight cursor-text hover:bg-black/5 rounded-lg px-1 -mx-1 transition-colors"
              style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E2A35', letterSpacing: -0.5 }}
              onClick={() => setEditingName(true)}
              title="Click to edit name"
            >
              {name}
            </h1>
          )}

          {/* Stage dropdown */}
          <select
            value={stage}
            onChange={e => { setStage(e.target.value as typeof stage); save({ stage: e.target.value }) }}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer appearance-none"
            style={{ background: stageStyle.bg, color: stageStyle.color }}
            title="Change stage"
          >
            {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Owner dropdown */}
          <select
            value={owner}
            onChange={e => { setOwner(e.target.value); save({ owner: e.target.value }) }}
            className="text-[11px] px-2 py-1 rounded-lg border cursor-pointer"
            style={{ borderColor: '#E8E2D6', color: '#6B7A82', background: '#FAFAF8' }}
            title="Owner"
          >
            {OWNERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            onClick={togglePin}
            title={pinned ? 'Unpin project' : 'Pin to home'}
            className="text-base leading-none transition-opacity hover:opacity-70"
          >
            {pinned ? '📌' : '📍'}
          </button>
          {saving && <span className="text-[11px]" style={{ color: '#9AA5AC' }}>saving…</span>}
        </div>

        {/* Summary — click to edit */}
        {editingSummary ? (
          <input
            autoFocus
            value={summary}
            onChange={e => setSummary(e.target.value)}
            onBlur={() => { setEditingSummary(false); save({ summary: summary || null }) }}
            onKeyDown={e => {
              if (e.key === 'Enter') { setEditingSummary(false); save({ summary: summary || null }) }
              if (e.key === 'Escape') { setSummary(project.summary ?? ''); setEditingSummary(false) }
            }}
            placeholder="One-line summary…"
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[13px] mb-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
        ) : (
          <p
            className="text-[13px] mb-2 cursor-text hover:bg-black/5 rounded px-1 -mx-1 transition-colors min-h-[20px]"
            style={{ color: summary ? '#6B7A82' : '#CDC3AE' }}
            onClick={() => setEditingSummary(true)}
            title="Click to edit summary"
          >
            {summary || 'Add a one-line summary…'}
          </p>
        )}

        {/* GitHub link */}
        {project.github_repo && (
          <a
            href={project.github_repo.startsWith('http') ? project.github_repo : `https://github.com/${project.github_repo}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-lg mb-2 mr-2"
            style={{ background: '#F5F0E8', color: '#1E2A35' }}
          >
            🐙 GitHub
          </a>
        )}

        {/* P&L stats */}
        <div className="flex items-center gap-4">
          <div className="text-[12px]">
            <span style={{ color: '#9AA5AC' }}>Revenue </span>
            <span className="font-bold" style={{ color: '#1E6B5E' }}>${revenueTotal.toFixed(0)}</span>
          </div>
          <div className="text-[12px]">
            <span style={{ color: '#9AA5AC' }}>Expenses </span>
            <span className="font-bold" style={{ color: '#C0392B' }}>${expenseTotal.toFixed(0)}</span>
          </div>
          <div className="text-[12px]">
            <span style={{ color: '#9AA5AC' }}>P&L </span>
            <span className="font-bold" style={{ color: pnl >= 0 ? '#1E6B5E' : '#C0392B' }}>
              {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={handleArchive} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: '#6B7A82', background: '#F5F0E8' }}>📦 Archive</button>
            <button onClick={handleDelete} className="text-[11px] px-2 py-1 rounded-lg" style={{ color: '#C0392B' }}>Delete…</button>
          </div>
        </div>
      </div>
    </div>
  )
}
