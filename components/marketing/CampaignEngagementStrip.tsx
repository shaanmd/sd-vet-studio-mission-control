// components/marketing/CampaignEngagementStrip.tsx
// Compact engagement summary shown on sent campaigns. Numbers come from
// webhook-captured aggregate counts on the campaigns row. For the rich
// drill-down (per-recipient timeline, link click breakdown, devices, etc.)
// we link out to Resend's dashboard rather than rebuilding it.

import type { Campaign } from '@/lib/types/database'

interface Props {
  campaign: Campaign
  firstResendMessageId: string | null
}

function pct(part: number, total: number): string {
  if (!total) return '—'
  return `${Math.round((part / total) * 100)}%`
}

export default function CampaignEngagementStrip({ campaign, firstResendMessageId }: Props) {
  const sent = campaign.sent_count
  const tiles = [
    { label: 'Delivered',    value: campaign.delivered_count,    subtitle: pct(campaign.delivered_count, sent),   color: '#1E6B5E', bg: '#E8F4F0' },
    { label: 'Opened',       value: campaign.opened_count,       subtitle: pct(campaign.opened_count, sent),      color: '#5B21B6', bg: '#EDE9FE' },
    { label: 'Clicked',      value: campaign.clicked_count,      subtitle: pct(campaign.clicked_count, sent),     color: '#B7791F', bg: '#FBF3DE' },
    { label: 'Bounced',      value: campaign.bounced_count,      subtitle: pct(campaign.bounced_count, sent),     color: '#C0392B', bg: '#FDECEA' },
    { label: 'Unsubscribed', value: campaign.unsubscribed_count, subtitle: pct(campaign.unsubscribed_count, sent),color: '#6B7280', bg: '#F3F4F6' },
  ]

  const resendUrl = firstResendMessageId
    ? `https://resend.com/emails/${firstResendMessageId}`
    : `https://resend.com/emails`

  return (
    <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E8E2D6', padding: 18 }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-semibold text-[12px] uppercase tracking-widest" style={{ color: '#9AA5AC' }}>
          📊 Engagement
        </h3>
        <a
          href={resendUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 12, fontWeight: 600,
            padding: '5px 12px', borderRadius: 8,
            background: '#fff', color: '#1E6B5E',
            border: '1px solid #1E6B5E',
            textDecoration: 'none',
          }}
        >
          📈 Open in Resend dashboard ↗
        </a>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {tiles.map(t => (
          <div
            key={t.label}
            className="rounded-xl"
            style={{ background: t.bg, padding: '10px 12px' }}
          >
            <div className="font-bold leading-none mb-1" style={{ fontSize: 22, color: t.color }}>
              {t.value}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.color, opacity: 0.8 }}>
              {t.label.toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: t.color, opacity: 0.6, marginTop: 2 }}>
              {t.subtitle}
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: '#9AA5AC', marginTop: 10 }}>
        Stats update as Resend webhooks fire. Open the Resend dashboard for per-recipient timeline,
        link-click breakdown, devices, and CSV export.
      </p>
    </div>
  )
}
