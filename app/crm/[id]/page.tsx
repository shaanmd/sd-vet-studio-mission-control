import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import AccordionSection from '@/components/project-detail/AccordionSection'
import type { Contact, ContactStatus, CommsLogEntry, CommsKind, NewsletterSubscription } from '@/lib/types/database'
import ContactActions from './ContactActions'
import CommsLog from './CommsLog'
import WhatIKnow from './WhatIKnow'
import Newsletters from './Newsletters'
import LifecycleStageEditor from './LifecycleStageEditor'
import { channelMeta, broughtInByLabel } from '@/components/leads/sourceConstants'

// ── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function statusPill(status: ContactStatus) {
  const map: Record<ContactStatus, { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: '#1E6B5E', bg: '#E8F1EE' },
    paused: { label: 'Paused', color: '#A07C2A', bg: '#FBF3DE' },
    past:   { label: 'Past',   color: '#6B7A82', bg: '#F0EEEC' },
  }
  const s = map[status]
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: s.color,
        background: s.bg,
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {s.label}
    </span>
  )
}

function stagePill(stage: string) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: '#7B5EA8',
        background: '#EEE8F6',
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      {stage}
    </span>
  )
}

function daysAgo(date: string | undefined): string {
  if (!date) return 'Never'
  const diffMs = Date.now() - new Date(date).getTime()
  const days = Math.round(diffMs / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function daysSince(isoDate: string): number {
  return Math.round((Date.now() - new Date(isoDate).getTime()) / 86400000)
}

// ── types ─────────────────────────────────────────────────────────────────────

interface LinkedProject {
  id: string
  contact_id: string
  project_id: string
  role_label: string | null
  created_at: string
  project: {
    id: string
    name: string
    emoji: string | null
    stage: string
    live_url: string | null
  } | null
}

// ── page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [contactRes, commsRes, projectsRes, subscriptionsRes] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', id).single(),
    supabase
      .from('comms_log')
      .select('*')
      .eq('contact_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('project_contacts')
      .select('*, project:projects(id, name, emoji, stage, live_url)')
      .eq('contact_id', id),
    supabase
      .from('newsletter_subscriptions')
      .select('*')
      .eq('contact_id', id)
      .order('subscribed_at', { ascending: false }),
  ])

  if (!contactRes.data || contactRes.error) notFound()

  const contact = contactRes.data as Contact
  const commsLog: CommsLogEntry[] = commsRes.data ?? []
  const linkedProjects: LinkedProject[] = projectsRes.data ?? []
  const subscriptions: NewsletterSubscription[] = subscriptionsRes.data ?? []
  const activeSubsCount = subscriptions.filter(s => s.unsubscribed_at === null).length

  const mostRecentComms = commsLog[0]
  const subtitle = [contact.role, contact.company, contact.location].filter(Boolean).join(' · ')

  const hasWhatIKnow =
    contact.comms_style ||
    contact.decision_style ||
    contact.personal_context ||
    contact.future_opportunities

  return (
    <>
      <TopBar crumbs={['CRM', contact.name]} />
      <div style={{ padding: '22px 28px', paddingBottom: 48, maxWidth: 860, margin: '0 auto' }}>

        {/* ── Header card ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl mb-4"
          style={{ background: '#FFFFFF', border: '1px solid #E8E2D6', padding: '20px' }}
        >
          {/* Row 1: avatar + name + pills + actions */}
          <div className="flex items-start gap-3">
            <div
              className="flex items-center justify-center rounded-full flex-shrink-0 font-semibold"
              style={{
                width: 48,
                height: 48,
                background: '#E8F1EE',
                color: '#1E6B5E',
                fontSize: 16,
              }}
            >
              {getInitials(contact.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="font-bold leading-tight"
                  style={{ fontSize: 24, color: '#0D2035' }}
                >
                  {contact.name}
                </h1>
                {statusPill(contact.status)}
                {contact.is_repeat && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#A07C2A',
                      background: '#FBF3DE',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    ⭐ Repeat client
                  </span>
                )}
              </div>

              {/* Row 2: subtitle */}
              {subtitle && (
                <p className="mt-1" style={{ fontSize: 13, color: '#6B7A82' }}>
                  {subtitle}
                </p>
              )}

              {/* Row 3: contact icons */}
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-1 text-sm"
                    style={{ color: '#1E6B5E', textDecoration: 'none' }}
                  >
                    <span>✉</span>
                    <span style={{ fontSize: 12 }}>{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1 text-sm"
                    style={{ color: '#1E6B5E', textDecoration: 'none' }}
                  >
                    <span>📱</span>
                    <span style={{ fontSize: 12 }}>{contact.phone}</span>
                  </a>
                )}
                {contact.website && (
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm"
                    style={{ color: '#1E6B5E', textDecoration: 'none' }}
                  >
                    <span>🌐</span>
                    <span style={{ fontSize: 12 }}>Website</span>
                  </a>
                )}
                {contact.linkedin && (
                  <a
                    href={contact.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm"
                    style={{ color: '#1E6B5E', textDecoration: 'none' }}
                  >
                    <span>💼</span>
                    <span style={{ fontSize: 12 }}>LinkedIn</span>
                  </a>
                )}
              </div>
            </div>

            {/* Top-right action buttons */}
            <ContactActions contactId={id} />
          </div>

          {/* Lifecycle + interest editor */}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F5F0E8' }}>
            <LifecycleStageEditor
              contactId={id}
              initialStage={contact.lifecycle_stage}
              initialInterest={contact.interest_level}
            />
          </div>

          {/* Source row */}
          {(contact.source_channel || contact.brought_in_by || contact.source) && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#6B7A82' }}>
              <span style={{ fontWeight: 600, color: '#9AA5AC', marginRight: 6 }}>Source:</span>
              {[
                channelMeta(contact.source_channel)?.emoji && channelMeta(contact.source_channel)
                  ? `${channelMeta(contact.source_channel)!.emoji} ${channelMeta(contact.source_channel)!.label}`
                  : null,
                contact.brought_in_by ? `via ${broughtInByLabel(contact.brought_in_by)}` : null,
                contact.source ?? null,
              ].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>

        {/* ── Pulse strip ───────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            {
              label: 'Projects',
              value: linkedProjects.length,
              big: String(linkedProjects.length),
            },
            {
              label: 'Comms logged',
              value: commsLog.length,
              big: String(commsLog.length),
            },
            {
              label: 'Newsletters',
              value: activeSubsCount,
              big: String(activeSubsCount),
            },
            {
              label: 'Last contact',
              value: null,
              big: daysAgo(mostRecentComms?.date),
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-xl p-4"
              style={{ background: '#FFFFFF', border: '1px solid #E8E2D6' }}
            >
              <div
                className="font-bold leading-none mb-1"
                style={{ fontSize: 22, color: '#0D2035' }}
              >
                {tile.big}
              </div>
              <div style={{ fontSize: 11, color: '#9AA5AC', fontWeight: 500 }}>
                {tile.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Projects accordion ────────────────────────────────────── */}
        <div className="mb-3">
          <AccordionSection
            icon="📁"
            title={`Linked projects (${linkedProjects.length})`}
            defaultOpen={linkedProjects.length > 0}
          >
            {linkedProjects.length === 0 ? (
              <div className="px-4 py-6 text-center" style={{ color: '#9AA5AC', fontSize: 13 }}>
                No projects linked yet.
              </div>
            ) : (
              <div className="divide-y" style={{ borderTop: '1px solid #E8E2D6' }}>
                {linkedProjects.map((lp) => (
                  <div
                    key={lp.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ background: '#FFFFFF' }}
                  >
                    <span style={{ fontSize: 18 }}>{lp.project?.emoji ?? '📦'}</span>
                    <span
                      className="flex-1 font-medium"
                      style={{ fontSize: 14, color: '#0D2035' }}
                    >
                      {lp.project?.name ?? 'Unknown project'}
                    </span>
                    {lp.project?.stage && stagePill(lp.project.stage)}
                    {lp.role_label && (
                      <span style={{ fontSize: 12, color: '#6B7A82' }}>{lp.role_label}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </AccordionSection>
        </div>

        {/* ── Comms log accordion ───────────────────────────────────── */}
        <div className="mb-3">
          <AccordionSection icon="💬" title="Comms log" defaultOpen>
            <CommsLog contactId={id} initialEntries={commsLog} />
          </AccordionSection>
        </div>

        {/* ── Newsletters accordion ─────────────────────────────────── */}
        <div className="mb-3">
          <AccordionSection
            icon="📧"
            title={`Newsletters${activeSubsCount > 0 ? ` (${activeSubsCount})` : ''}`}
            defaultOpen={subscriptions.length > 0}
          >
            <Newsletters contactId={id} initialSubscriptions={subscriptions} />
          </AccordionSection>
        </div>

        {/* ── What I know accordion ─────────────────────────────────── */}
        <div className="mb-3">
          <AccordionSection
            icon="🧠"
            title="What I know"
            defaultOpen={!!hasWhatIKnow}
          >
            <WhatIKnow contactId={id} contact={contact} />
          </AccordionSection>
        </div>

      </div>
    </>
  )
}
