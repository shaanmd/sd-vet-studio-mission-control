// app/api/webhooks/resend/route.ts
// Inbound webhook handler for Resend events. Verifies the Svix signature,
// records the raw event for replay/debug, and updates campaign_sends +
// campaign aggregate counts.
//
// Env vars required:
//   - RESEND_WEBHOOK_SECRET     (from Resend dashboard → Webhooks → Signing secret)
//   - SUPABASE_SERVICE_ROLE_KEY (to bypass RLS — there's no user session here)

import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createServiceClient } from '@/lib/supabase/service'
import { detectDevice } from '@/lib/email/device'

export const dynamic = 'force-dynamic'

interface ResendEventBase {
  type: string
  created_at: string
  data: {
    email_id?: string
    from?: string
    to?: string | string[]
    subject?: string
    user_agent?: string
    ip?: string
    click?: { link?: string; timestamp?: string; userAgent?: string; ipAddress?: string }
    open?:  { timestamp?: string; userAgent?: string; ipAddress?: string }
    bounce?: { message?: string; subType?: string }
    [k: string]: unknown
  }
}

const STATUS_BY_EVENT: Record<string, string> = {
  'email.sent':              'sent',
  'email.delivered':         'delivered',
  'email.delivery_delayed':  'sent',         // still in flight, don't downgrade
  'email.bounced':           'bounced',
  'email.complained':        'complained',
  'email.opened':            'opened',
  'email.clicked':           'clicked',
  'email.failed':            'failed',
  'contact.unsubscribed':    'unsubscribed',
}

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Verify Svix signature
  const headers = {
    'svix-id':        req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  }
  const rawBody = await req.text()

  let event: ResendEventBase
  try {
    const wh = new Webhook(secret)
    event = wh.verify(rawBody, headers) as ResendEventBase
  } catch (err: any) {
    return NextResponse.json({ error: `Signature verification failed: ${err?.message ?? 'unknown'}` }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Idempotency: skip if we've already processed this event id
  const eventId = headers['svix-id'] || null
  if (eventId) {
    const { data: existing } = await supabase
      .from('resend_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (existing) return NextResponse.json({ ok: true, skipped: 'already processed' })
  }

  // Always log the raw event for replay/debug
  await supabase.from('resend_webhook_events').insert({
    event_id: eventId,
    event_type: event.type,
    email_id: event.data.email_id ?? null,
    payload: event,
  })

  const emailId = event.data.email_id
  if (!emailId) {
    return NextResponse.json({ ok: true, note: 'no email_id, nothing to update' })
  }

  // Find the campaign_send row by Resend message id
  const { data: send } = await supabase
    .from('campaign_sends')
    .select('id, campaign_id, status, open_count, click_count, first_opened_at, device, contact_id')
    .eq('resend_message_id', emailId)
    .maybeSingle()
  if (!send) {
    // Could be a daily digest or unrelated send — don't error, just acknowledge
    return NextResponse.json({ ok: true, note: 'no matching campaign_send' })
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = { last_event_at: now }
  const counterDeltas: Record<string, number> = {}

  switch (event.type) {
    case 'email.delivered': {
      update.delivered_at = now
      update.status = upgrade(send.status, 'delivered')
      counterDeltas.delivered_count = 1
      break
    }
    case 'email.opened': {
      const wasOpened = !!send.first_opened_at
      update.opened_at = now
      if (!wasOpened) update.first_opened_at = now
      update.open_count = (send.open_count ?? 0) + 1
      update.status = upgrade(send.status, 'opened')
      const ua = event.data.open?.userAgent ?? null
      if (ua) update.device = send.device ?? detectDevice(ua)
      if (!wasOpened) counterDeltas.opened_count = 1   // unique-opens only
      break
    }
    case 'email.clicked': {
      update.clicked_at = now
      update.click_count = (send.click_count ?? 0) + 1
      update.status = upgrade(send.status, 'clicked')
      const ua = event.data.click?.userAgent ?? null
      const url = event.data.click?.link
      if (ua && !send.device) update.device = detectDevice(ua)

      if (url) {
        await supabase.from('campaign_link_clicks').insert({
          campaign_id: send.campaign_id,
          contact_id:  send.contact_id,
          send_id:     send.id,
          url,
          user_agent:  ua,
          device:      ua ? detectDevice(ua) : null,
        })
      }
      // Only count first click per send toward campaign.clicked_count
      if (!send.click_count || send.click_count === 0) counterDeltas.clicked_count = 1
      break
    }
    case 'email.bounced': {
      update.bounced_at = now
      update.status = 'bounced'
      update.error_message = event.data.bounce?.message ?? null
      counterDeltas.bounced_count = 1
      break
    }
    case 'email.complained': {
      update.complained_at = now
      update.status = 'complained'
      counterDeltas.complained_count = 1
      break
    }
    case 'email.failed': {
      update.status = 'failed'
      update.error_message = (event.data as any)?.failed?.reason ?? null
      break
    }
    case 'contact.unsubscribed': {
      update.unsubscribed_at = now
      update.status = 'unsubscribed'
      counterDeltas.unsubscribed_count = 1
      break
    }
    default: {
      // No-op for sent / delivery_delayed — already tracked via initial send
      const known = STATUS_BY_EVENT[event.type]
      if (known) update.status = upgrade(send.status, known)
    }
  }

  await supabase.from('campaign_sends').update(update).eq('id', send.id)

  // Apply deltas to the campaign's aggregate counts
  if (Object.keys(counterDeltas).length > 0) {
    const { data: c } = await supabase
      .from('campaigns')
      .select('delivered_count, opened_count, clicked_count, bounced_count, complained_count, unsubscribed_count')
      .eq('id', send.campaign_id)
      .single()
    if (c) {
      const next = {
        delivered_count:    (c.delivered_count    ?? 0) + (counterDeltas.delivered_count    ?? 0),
        opened_count:       (c.opened_count       ?? 0) + (counterDeltas.opened_count       ?? 0),
        clicked_count:      (c.clicked_count      ?? 0) + (counterDeltas.clicked_count      ?? 0),
        bounced_count:      (c.bounced_count      ?? 0) + (counterDeltas.bounced_count      ?? 0),
        complained_count:   (c.complained_count   ?? 0) + (counterDeltas.complained_count   ?? 0),
        unsubscribed_count: (c.unsubscribed_count ?? 0) + (counterDeltas.unsubscribed_count ?? 0),
      }
      await supabase.from('campaigns').update(next).eq('id', send.campaign_id)
    }
  }

  return NextResponse.json({ ok: true, type: event.type })
}

/** Status-state machine: never downgrade a more-engaged status to a less-engaged one. */
function upgrade(current: string | null | undefined, incoming: string): string {
  const order = ['queued', 'sent', 'delivered', 'opened', 'clicked']
  const ci = order.indexOf(current ?? 'queued')
  const ii = order.indexOf(incoming)
  if (ii > ci) return incoming
  // Terminal/negative states always win
  if (['bounced', 'complained', 'failed', 'unsubscribed'].includes(incoming)) return incoming
  return current ?? incoming
}
