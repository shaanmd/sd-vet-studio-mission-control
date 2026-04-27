'use server'
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import Link from 'next/link'
import type { Contact, ContactStatus, CommsLogEntry } from '@/lib/types/database'
import NewContactButton from './NewContactButton'

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function getStatusPill(status: ContactStatus) {
  if (status === 'active') {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#1E6B5E',
          background: '#E8F1EE',
          padding: '2px 8px',
          borderRadius: 999,
        }}
      >
        Active
      </span>
    )
  }
  if (status === 'paused') {
    return (
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
        Paused
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: '#6B7A82',
        background: '#F0EEEC',
        padding: '2px 8px',
        borderRadius: 999,
      }}
    >
      Past
    </span>
  )
}

function formatLastComms(date: string | undefined): string | null {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.round(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.round(diffDays / 30)
  return `${diffMonths}mo ago`
}

type ContactWithComms = Contact & {
  comms_log?: Pick<CommsLogEntry, 'date' | 'kind' | 'summary'>[]
  newsletter_subscriptions?: { unsubscribed_at: string | null }[]
}

export default async function CRMPage() {
  const supabase = await createClient()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*, comms_log(date, kind, summary), newsletter_subscriptions(unsubscribed_at)')
    .order('name') as { data: ContactWithComms[] | null }

  const contactList: ContactWithComms[] = contacts ?? []

  return (
    <>
      <TopBar crumbs={['CRM', 'Contacts']} />
      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-1">
          <h1
            className="font-bold leading-tight"
            style={{ fontSize: 26, color: '#0D2035' }}
          >
            👥 Contacts
          </h1>
          <NewContactButton />
        </div>

        {/* Contact count */}
        <p className="mb-5" style={{ fontSize: 13, color: '#6B7A82' }}>
          {contactList.length} {contactList.length === 1 ? 'contact' : 'contacts'}
        </p>

        {/* Empty state */}
        {contactList.length === 0 && (
          <div
            className="rounded-2xl flex flex-col items-center justify-center text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8E2D6',
              padding: '48px',
            }}
          >
            <div className="text-5xl mb-4">🤝</div>
            <h2 className="font-bold mb-2" style={{ fontSize: 18, color: '#0D2035' }}>
              No contacts yet
            </h2>
            <p className="text-sm mb-6 max-w-sm" style={{ color: '#6B7A82' }}>
              Add your first contact to start building your CRM.
            </p>
            <NewContactButton label="+ Add contact →" />
          </div>
        )}

        {/* Contact list */}
        {contactList.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {contactList.map((contact) => {
              const initials = getInitials(contact.name)
              const sortedComms = (contact.comms_log ?? []).slice().sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              const lastCommsDate = sortedComms[0]?.date
              const lastCommsLabel = formatLastComms(lastCommsDate)
              const subtitle = [contact.role, contact.company].filter(Boolean).join(' · ')
              const activeSubs = (contact.newsletter_subscriptions ?? []).filter(s => s.unsubscribed_at === null).length

              return (
                <Link
                  key={contact.id}
                  href={`/crm/${contact.id}`}
                  className="group flex items-center gap-3 rounded-xl px-4 py-3 transition-shadow hover:shadow-md"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E8E2D6',
                    textDecoration: 'none',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center rounded-full flex-shrink-0 font-semibold"
                    style={{
                      width: 36,
                      height: 36,
                      background: '#E8F1EE',
                      color: '#1E6B5E',
                      fontSize: 13,
                    }}
                  >
                    {initials}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="font-semibold truncate"
                        style={{ fontSize: 14, color: '#0D2035' }}
                      >
                        {contact.name}
                      </span>
                      {getStatusPill(contact.status)}
                      {activeSubs > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: '#1E6B5E',
                            background: '#E8F1EE',
                            padding: '2px 6px',
                            borderRadius: 999,
                          }}
                          title={`${activeSubs} active newsletter${activeSubs === 1 ? '' : 's'}`}
                        >
                          📧 {activeSubs}
                        </span>
                      )}
                    </div>
                    {subtitle && (
                      <div
                        className="truncate"
                        style={{ fontSize: 12, color: '#6B7A82', marginTop: 1 }}
                      >
                        {subtitle}
                      </div>
                    )}
                    {contact.email && (
                      <div
                        className="truncate"
                        style={{ fontSize: 12, color: '#9AA5AC', marginTop: 1 }}
                      >
                        {contact.email}
                      </div>
                    )}
                  </div>

                  {/* Right: last comms + arrow */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lastCommsLabel && (
                      <span style={{ fontSize: 11, color: '#9AA5AC' }}>
                        {lastCommsLabel}
                      </span>
                    )}
                    <span
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ fontSize: 14, color: '#9AA5AC' }}
                    >
                      →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
