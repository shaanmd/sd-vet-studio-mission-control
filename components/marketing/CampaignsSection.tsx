// components/marketing/CampaignsSection.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Campaign } from '@/lib/types/database'
import NewCampaignButton from './NewCampaignButton'

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  draft:   { label: 'Draft',   bg: '#F5F0E8', color: '#6B7A82' },
  sending: { label: 'Sending', bg: '#FBF3DE', color: '#B7791F' },
  sent:    { label: 'Sent',    bg: '#E8F4F0', color: '#1E6B5E' },
  failed:  { label: 'Failed',  bg: '#FDECEA', color: '#C0392B' },
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const days = Math.round((Date.now() - d.getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CampaignsSection() {
  const supabase = await createClient()
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(20)

  const list: Campaign[] = (campaigns ?? []) as Campaign[]
  const sentLast30 = list.filter(c =>
    c.status === 'sent' && c.sent_at && (Date.now() - new Date(c.sent_at).getTime()) < 30 * 86400000
  ).length

  return (
    <section className="mb-7">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-[12px] uppercase tracking-widest" style={{ color: '#9AA5AC' }}>
          📧 Email campaigns
          {list.length > 0 && (
            <span className="ml-2" style={{ color: '#CDC3AE' }}>· {list.length}</span>
          )}
        </h2>
        <NewCampaignButton />
      </div>

      {list.length === 0 ? (
        <div
          className="rounded-xl flex flex-col items-center justify-center text-center"
          style={{ background: '#fff', border: '1px solid #E8E2D6', padding: 32 }}
        >
          <div className="text-3xl mb-2">📧</div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: '#0D2035' }}>
            No campaigns yet
          </p>
          <p className="text-[12px] mb-4" style={{ color: '#6B7A82' }}>
            Compose your first newsletter — markdown editor, live preview, send to a list.
          </p>
          <NewCampaignButton label="+ New campaign" />
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6', background: '#fff' }}>
          {list.map((c, i) => {
            const pill = STATUS_PILL[c.status] ?? STATUS_PILL.draft
            const subtitle = (() => {
              if (c.status === 'sent') {
                const openPct = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0
                const clickPct = c.sent_count > 0 ? Math.round((c.clicked_count / c.sent_count) * 100) : 0
                return `Sent ${formatDate(c.sent_at)} · ${c.sent_count} delivered · ${openPct}% open · ${clickPct}% click`
              }
              if (c.status === 'sending') return `Sending now · ${c.sent_count}/${c.recipient_count}`
              return `Last edited ${formatDate(c.updated_at)}`
            })()
            return (
              <Link
                key={c.id}
                href={`/marketing/campaigns/${c.id}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors"
                style={{
                  borderBottom: i < list.length - 1 ? '1px solid #EFEAE0' : 'none',
                  textDecoration: 'none',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate" style={{ fontSize: 14, color: '#0D2035' }}>
                      {c.subject || <em style={{ color: '#9AA5AC', fontStyle: 'normal' }}>(no subject)</em>}
                    </span>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 999,
                        background: pill.bg, color: pill.color,
                      }}
                    >
                      {pill.label}
                    </span>
                    <span
                      style={{
                        fontSize: 10, fontWeight: 500,
                        padding: '2px 8px', borderRadius: 999,
                        background: '#F5F0E8', color: '#6B7A82',
                      }}
                    >
                      {c.list_name}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9AA5AC', marginTop: 2 }}>
                    {subtitle}
                  </div>
                </div>
                <span style={{ fontSize: 14, color: '#CDC3AE' }} className="opacity-0 group-hover:opacity-100">→</span>
              </Link>
            )
          })}
        </div>
      )}

      {sentLast30 > 0 && (
        <p className="text-[11px] mt-2" style={{ color: '#9AA5AC' }}>
          {sentLast30} campaign{sentLast30 === 1 ? '' : 's'} sent in the last 30 days
        </p>
      )}
    </section>
  )
}
