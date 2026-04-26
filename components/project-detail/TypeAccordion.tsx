'use client'

import type { Project, ProjectType } from '@/lib/types/database'

// ── Props ─────────────────────────────────────────────────────────────────────

interface TypeAccordionProps {
  project: Project
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  href,
}: {
  label: string
  value: string | null | undefined
  href?: string
}) {
  const display = value || null
  return (
    <div>
      <div
        className="text-[11px] font-semibold uppercase tracking-wide mb-1"
        style={{ color: '#9AA5AC' }}
      >
        {label}
      </div>
      {href && display ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium hover:underline"
          style={{ color: '#1E6B5E' }}
        >
          {display}
        </a>
      ) : (
        <div
          className="text-[13px] font-medium"
          style={{ color: display ? '#1E2A35' : '#CDC3AE' }}
        >
          {display ?? '—'}
        </div>
      )}
    </div>
  )
}

// ── Delivery countdown pill ───────────────────────────────────────────────────

function DeliveryPill({ deliveryDate }: { deliveryDate: string | null }) {
  if (!deliveryDate) return <span style={{ color: '#CDC3AE', fontSize: 13 }}>—</span>

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(deliveryDate)
  due.setHours(0, 0, 0, 0)
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  let label: string
  let bg: string
  let color: string

  if (diffDays < 0) {
    label = `${Math.abs(diffDays)}d overdue`
    bg = '#FDECEA'
    color = '#C0392B'
  } else if (diffDays === 0) {
    label = 'Due today!'
    bg = '#FDECEA'
    color = '#C0392B'
  } else if (diffDays <= 7) {
    label = `${diffDays}d to go`
    bg = '#FEF3C7'
    color = '#B7791F'
  } else {
    label = due.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    bg = '#E8F1EE'
    color = '#1E6B5E'
  }

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 10,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  )
}

// ── Avatar initials ───────────────────────────────────────────────────────────

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: '#E8F0F8',
        color: '#3A6C98',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

// ── Type-specific panels ──────────────────────────────────────────────────────

function WebsitePanel({ project }: { project: Project }) {
  const firstDomain = project.domains?.[0]?.name ?? null

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <InfoRow label="Platform" value={project.tech_stack} />
      <InfoRow label="Domain" value={firstDomain} href={firstDomain ? `https://${firstDomain}` : undefined} />
      <InfoRow label="Client name" value={project.client_name} />
      <div>
        <div
          className="text-[11px] font-semibold uppercase tracking-wide mb-1"
          style={{ color: '#9AA5AC' }}
        >
          Delivery date
        </div>
        <div className="flex items-center gap-2">
          {project.delivery_date && (
            <span className="text-[13px] font-medium" style={{ color: '#1E2A35' }}>
              {new Date(project.delivery_date).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          )}
          <DeliveryPill deliveryDate={project.delivery_date} />
        </div>
      </div>
      <div>
        <div
          className="text-[11px] font-semibold uppercase tracking-wide mb-1"
          style={{ color: '#9AA5AC' }}
        >
          GA4 Property ID
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[13px] font-medium"
            style={{ color: project.ga4_property_id ? '#1E2A35' : '#CDC3AE' }}
          >
            {project.ga4_property_id ?? '—'}
          </span>
          {project.ga4_property_id && (
            <a
              href={`https://analytics.google.com/analytics/web/#/p${project.ga4_property_id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#1E6B5E', fontWeight: 600 }}
            >
              Open GA4 ↗
            </a>
          )}
        </div>
      </div>
      <InfoRow
        label="Monthly visitors"
        value={project.monthly_visitors != null ? project.monthly_visitors.toLocaleString() : null}
      />
    </div>
  )
}

function SaasPanel({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <InfoRow label="Tech stack" value={project.tech_stack} />
      <InfoRow label="Live URL" value={project.live_url} href={project.live_url ?? undefined} />
      <InfoRow label="GitHub" value={project.github_repo} href={project.github_repo ?? undefined} />
      <InfoRow
        label="Monthly visitors"
        value={project.monthly_visitors != null ? project.monthly_visitors.toLocaleString() : null}
      />
    </div>
  )
}

function CoursePanel({ project }: { project: Project }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <InfoRow label="Platform" value={project.tech_stack} />
      <InfoRow label="Pricing" value={null} />
      <InfoRow label="Cohort dates" value={null} />
      <InfoRow label="Modules" value={null} />
    </div>
  )
}

function ConsultingPanel({ project }: { project: Project }) {
  const hoursLogged = project.pulse_values?.find(p => p.tile_id === 'hours_logged')

  return (
    <div className="flex flex-col gap-4">
      {/* Client card */}
      {project.client_name && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: '#FDFAF5', border: '1px solid #E8E2D6' }}
        >
          <AvatarInitials name={project.client_name} />
          <div className="min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: '#0D2035' }}>
              {project.client_name}
            </div>
            {project.client_email && (
              <a
                href={`mailto:${project.client_email}`}
                className="text-[12px] hover:underline"
                style={{ color: '#1E6B5E' }}
              >
                {project.client_email}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {!project.client_name && <InfoRow label="Client name" value={null} />}
        {!project.client_email && <InfoRow label="Client email" value={null} />}
        <div>
          <div
            className="text-[11px] font-semibold uppercase tracking-wide mb-1"
            style={{ color: '#9AA5AC' }}
          >
            Delivery date
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {project.delivery_date && (
              <span className="text-[13px] font-medium" style={{ color: '#1E2A35' }}>
                {new Date(project.delivery_date).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            )}
            <DeliveryPill deliveryDate={project.delivery_date} />
          </div>
        </div>
        <div>
          <div
            className="text-[11px] font-semibold uppercase tracking-wide mb-1"
            style={{ color: '#9AA5AC' }}
          >
            Hours logged
          </div>
          <div
            className="text-[13px] font-medium"
            style={{ color: hoursLogged?.value != null ? '#1E2A35' : '#CDC3AE' }}
          >
            {hoursLogged?.value != null ? `${hoursLogged.value}h` : '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function OtherPanel() {
  return (
    <p className="text-[13px] italic" style={{ color: '#9AA5AC' }}>
      Use the pulse tiles above to define what matters for this project.
    </p>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TypeAccordion({ project }: TypeAccordionProps) {
  const type: ProjectType | null = project.project_type

  function renderContent() {
    switch (type) {
      case 'website_build':
        return <WebsitePanel project={project} />
      case 'saas':
        return <SaasPanel project={project} />
      case 'course':
        return <CoursePanel project={project} />
      case 'consulting':
        return <ConsultingPanel project={project} />
      default:
        return <OtherPanel />
    }
  }

  return (
    <div className="px-5 py-4">
      {renderContent()}
    </div>
  )
}
