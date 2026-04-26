'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ProjectType, LaunchGate } from '@/lib/types/database'

// ── Static data ──────────────────────────────────────────────────────────────

const UNIVERSAL_GATES: Omit<LaunchGate, 'checked' | 'custom' | 'sort_order'>[] = [
  { id: 'domain_live',         label: 'Domain live',           hint: 'A real URL someone could land on. Includes redirect from www and HTTPS.' },
  { id: 'analytics_installed', label: 'Analytics installed',   hint: 'GA4 or Plausible firing on every page. We can see traffic, bounce, top pages.' },
  { id: 'payment_working',     label: 'Payment working',       hint: 'A real test charge succeeded end-to-end. Stripe / Lemon / whatever applies.' },
  { id: 'email_capture',       label: 'Email capture working', hint: 'Newsletter / onboarding / lead-magnet form posts to a real list.' },
  { id: 'first_customer',      label: 'First customer / user', hint: 'Not us. Not friends-and-family discount. A real person paid or signed up.' },
  { id: 'backup_monitoring',   label: 'Backup + monitoring',   hint: 'If it goes down at 2am, we get an alert. If it disappears, we have a snapshot.' },
]

const TYPE_GATES: Record<string, Omit<LaunchGate, 'checked' | 'custom' | 'sort_order'>[]> = {
  website_build: [
    { id: 'ws_10_content', label: '10 pieces of content live',    hint: 'A site with 1 post is not really a site. Cadence proves the engine works.' },
    { id: 'ws_ctas',       label: 'Internal CTAs to other props', hint: 'Lead-gen sites should funnel to your SaaS / course / consulting.' },
    { id: 'ws_seo_basics', label: 'SEO basics',                   hint: 'Sitemap, meta titles, schema, OG tags. Indexed in Google Search Console.' },
  ],
  saas: [
    { id: 'saas_status',  label: 'Status page',       hint: 'Public uptime + incident history. Builds trust with paying customers.' },
    { id: 'saas_support', label: 'Support inbox',     hint: 'A real address (not no-reply@). Logged, triaged, answered within 24h.' },
    { id: 'saas_1k_mrr',  label: '$1k MRR milestone', hint: "Proof someone will pay for this monthly, repeatedly. Otherwise it's a side project." },
  ],
  course: [
    { id: 'course_testimonial', label: 'First testimonial collected', hint: 'A named, faced, quotable result. Goes on the sales page.' },
    { id: 'course_affiliate',   label: 'Affiliate / referral live',   hint: 'Cohort 1 alumni become cohort 2 marketers. The fly-wheel.' },
    { id: 'course_50_enrolled', label: '50 enrolment milestone',      hint: 'Past this point the course is a real product, not just a launch.' },
  ],
  consulting: [
    { id: 'cons_contract', label: 'Contract + deposit signed',  hint: 'Signed contract and deposit received before work begins.' },
    { id: 'cons_scope',    label: 'Scope + sitemap approved',   hint: 'Client has signed off on the scope of work document.' },
    { id: 'cons_handoff',  label: 'Final handoff + invoice',    hint: 'Deliverables handed over and final invoice sent.' },
  ],
  other: [
    { id: 'other_define', label: 'Define what "live" means', hint: 'Write down exactly what done looks like for this project.' },
  ],
}

// ── Seeding helper ───────────────────────────────────────────────────────────

function seedGates(projectType: ProjectType | null): LaunchGate[] {
  const typeKey = projectType ?? 'other'
  const typeExtras = TYPE_GATES[typeKey] ?? []
  const all = [...UNIVERSAL_GATES, ...typeExtras]
  return all.map((g, i) => ({ ...g, checked: false, custom: false, sort_order: i }))
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CheckCircle({ checked }: { checked: boolean }) {
  if (checked) {
    return (
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#1E6B5E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#fff', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>✓</span>
      </div>
    )
  }
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: '2px solid #D9D2C2',
        flexShrink: 0,
      }}
    />
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface LaunchGatesProps {
  projectId: string
  projectType: ProjectType | null
  gates: LaunchGate[]
}

export default function LaunchGates({ projectId, projectType, gates: gatesProp }: LaunchGatesProps) {
  const router = useRouter()
  const [editMode, setEditMode] = useState(false)
  const [gates, setGates] = useState<LaunchGate[]>(() =>
    gatesProp.length === 0 ? seedGates(projectType) : gatesProp
  )
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  async function patchGates(updated: LaunchGate[]) {
    setSaving(true)
    setGates(updated)
    await fetch(`/api/projects/${projectId}/gates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gates: updated }),
    })
    setSaving(false)
    router.refresh()
  }

  function toggleChecked(id: string) {
    const updated = gates.map(g => g.id === id ? { ...g, checked: !g.checked } : g)
    patchGates(updated)
  }

  function removeGate(id: string) {
    const updated = gates.filter(g => g.id !== id)
    patchGates(updated)
  }

  async function addCustomGate() {
    const trimmed = newLabel.trim()
    if (!trimmed) return
    const newGate: LaunchGate = {
      id: `custom_${Date.now()}`,
      label: trimmed,
      hint: undefined,
      checked: false,
      custom: true,
      sort_order: gates.length,
    }
    setNewLabel('')
    await patchGates([...gates, newGate])
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addCustomGate()
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const checkedCount = gates.filter(g => g.checked).length
  const total = gates.length
  const pct = total === 0 ? 0 : Math.round((checkedCount / total) * 100)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ borderTop: '1px solid #F5F0E8' }}>
      {/* Progress bar + edit toggle */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-2">
          {/* Progress label */}
          <span style={{ fontSize: 12, color: '#6B7A82', fontWeight: 500, whiteSpace: 'nowrap' }}>
            <span style={{ color: '#0D2035', fontWeight: 700 }}>{checkedCount}</span>
            {' of '}
            <span style={{ color: '#0D2035', fontWeight: 700 }}>{total}</span>
            {' · '}
            <span style={{ color: '#1E6B5E', fontWeight: 700 }}>{pct}%</span>
          </span>

          {/* Bar */}
          <div style={{ flex: 1, height: 4, background: '#F5F0E8', borderRadius: 2, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: '#1E6B5E',
                borderRadius: 2,
                transition: 'width 300ms ease',
              }}
            />
          </div>

          {/* Edit/Done toggle */}
          <button
            onClick={() => setEditMode(v => !v)}
            disabled={saving}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: editMode ? '#1E6B5E' : '#6B7A82',
              whiteSpace: 'nowrap',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {editMode ? '✓ Done' : '✎ Edit'}
          </button>
        </div>
      </div>

      {/* Gate list */}
      <div className="px-5 pb-4 flex flex-col gap-0">
        {gates.map((gate) => (
          <div
            key={gate.id}
            className="flex items-start gap-3 py-2.5"
            style={{ borderBottom: '1px solid #F5F0E8' }}
          >
            {/* Drag handle (visual only) */}
            {editMode && (
              <span
                style={{ color: '#CDC3AE', fontSize: 14, cursor: 'grab', flexShrink: 0, marginTop: 2, userSelect: 'none' }}
                aria-hidden
              >
                ⠿
              </span>
            )}

            {/* Checkbox */}
            <button
              type="button"
              onClick={() => toggleChecked(gate.id)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', marginTop: 1 }}
              aria-label={gate.checked ? `Uncheck ${gate.label}` : `Check ${gate.label}`}
            >
              <CheckCircle checked={gate.checked} />
            </button>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#1E2A35',
                    textDecoration: gate.checked ? 'line-through' : 'none',
                    opacity: gate.checked ? 0.6 : 1,
                  }}
                >
                  {gate.label}
                </span>
                {gate.custom && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: '#EEE8F6',
                      color: '#7B5EA8',
                      letterSpacing: '0.03em',
                    }}
                  >
                    CUSTOM
                  </span>
                )}
              </div>
              {gate.hint && (
                <p style={{ fontSize: 12, color: '#9AA5AC', marginTop: 2 }}>{gate.hint}</p>
              )}
            </div>

            {/* Remove button (edit mode, custom only) */}
            {editMode && gate.custom && (
              <button
                type="button"
                onClick={() => removeGate(gate.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: '#9AA5AC',
                  fontSize: 13,
                  flexShrink: 0,
                  marginTop: 2,
                }}
                aria-label={`Remove ${gate.label}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {/* Add custom gate row */}
        {editMode && (
          <div className="flex items-center gap-2 pt-3">
            <input
              ref={inputRef}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="+ Add custom gate…"
              style={{
                flex: 1,
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #E8E2D6',
                background: '#FDFAF5',
                color: '#0D2035',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={addCustomGate}
              disabled={!newLabel.trim() || saving}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#1E6B5E',
                color: '#fff',
                border: 'none',
                cursor: newLabel.trim() ? 'pointer' : 'default',
                opacity: newLabel.trim() ? 1 : 0.4,
              }}
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Footer note (edit mode) */}
      {editMode && (
        <p
          style={{
            fontSize: 11,
            color: '#9AA5AC',
            padding: '0 20px 16px',
          }}
        >
          Universal gates can be unchecked but not removed. Custom gates can be removed freely.
        </p>
      )}
    </div>
  )
}
