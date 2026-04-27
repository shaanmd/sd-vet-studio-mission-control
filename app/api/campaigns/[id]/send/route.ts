// app/api/campaigns/[id]/send/route.ts
// Send the campaign to every active subscriber of its list. Writes a
// campaign_sends row per recipient, captures Resend message ids, and updates
// campaign-level counts. Idempotency: if the campaign is already 'sending' or
// 'sent', refuse.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendCampaignEmail } from '@/lib/email/campaign'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load campaign and lock state
  const { data: campaign, error: campaignErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()
  if (campaignErr || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (campaign.status === 'sent')    return NextResponse.json({ error: 'Already sent' }, { status: 400 })
  if (campaign.status === 'sending') return NextResponse.json({ error: 'Send already in progress' }, { status: 400 })
  if (!campaign.subject?.trim())     return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  if (!campaign.body_markdown?.trim()) return NextResponse.json({ error: 'Body is empty' }, { status: 400 })

  // Fetch the list's identity (from-email + brand colors). Falls back to
  // global defaults if the list isn't yet configured.
  const { data: listConfig } = await supabase
    .from('newsletter_lists')
    .select('from_email, from_name, brand_primary, brand_accent')
    .eq('name', campaign.list_name)
    .maybeSingle()

  const fromName = listConfig?.from_name ?? 'Mission Control'
  const fromEmail = listConfig?.from_email ?? 'noreply@sdvetstudio.com'
  const fromHeader = `${fromName} <${fromEmail}>`
  const brandPrimary = listConfig?.brand_primary ?? '#1E6B5E'
  const brandAccent  = listConfig?.brand_accent  ?? '#D4A853'

  // Pull active subscribers for this list, joined to contacts for name + email
  const { data: subs, error: subsErr } = await supabase
    .from('newsletter_subscriptions')
    .select('id, contact_id, contact:contacts(id, name, email)')
    .eq('list_name', campaign.list_name)
    .is('unsubscribed_at', null)
  if (subsErr) return NextResponse.json({ error: subsErr.message }, { status: 500 })

  type SubRow = { id: string; contact_id: string; contact: { id: string; name: string | null; email: string | null } | null }
  const recipients = (subs as unknown as SubRow[] ?? [])
    .filter(s => s.contact?.email)
    .map(s => ({
      contact_id: s.contact!.id,
      name: s.contact!.name,
      email: s.contact!.email!,
    }))

  if (recipients.length === 0) {
    return NextResponse.json({ error: `No active subscribers for list "${campaign.list_name}"` }, { status: 400 })
  }

  // Mark sending + recipient count
  await supabase
    .from('campaigns')
    .update({ status: 'sending', recipient_count: recipients.length, sent_count: 0, failed_count: 0 })
    .eq('id', id)

  let sent = 0
  let failed = 0
  const errors: { email: string; error: string }[] = []

  // Send sequentially to avoid Resend rate limits (default 10 req/sec on free tier).
  // For lists < 200 this is fine within a 60s function. Larger lists: batch via cron.
  for (const r of recipients) {
    const outcome = await sendCampaignEmail({
      to: r.email,
      recipientName: r.name,
      subject: campaign.subject,
      bodyMarkdown: campaign.body_markdown,
      previewText: campaign.preview_text,
      from: fromHeader,
      fromName,
      brandPrimary,
      brandAccent,
    })

    if (outcome.ok) {
      sent++
      await supabase.from('campaign_sends').upsert({
        campaign_id: id,
        contact_id: r.contact_id,
        email: r.email,
        resend_message_id: outcome.messageId ?? null,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }, { onConflict: 'campaign_id,contact_id' })
    } else {
      failed++
      errors.push({ email: r.email, error: outcome.error ?? 'unknown' })
      await supabase.from('campaign_sends').upsert({
        campaign_id: id,
        contact_id: r.contact_id,
        email: r.email,
        status: 'failed',
        error_message: outcome.error ?? null,
      }, { onConflict: 'campaign_id,contact_id' })
    }
  }

  // Final state update
  const finalStatus = failed > 0 && sent === 0 ? 'failed' : 'sent'
  await supabase
    .from('campaigns')
    .update({
      status: finalStatus,
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({
    ok: failed === 0,
    sent,
    failed,
    recipient_count: recipients.length,
    errors: errors.slice(0, 10), // cap so the response stays small
  })
}
