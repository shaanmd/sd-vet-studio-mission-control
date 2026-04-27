// app/api/campaigns/[id]/test/route.ts
// Send a test version of the campaign to a single email (defaults to the
// caller's profile email). Doesn't write to campaign_sends — purely for
// previewing deliverability and rendering before the real send.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendCampaignEmail } from '@/lib/email/campaign'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const recipient = (body.email ?? user.email ?? '').trim()
  if (!recipient) return NextResponse.json({ error: 'No recipient email' }, { status: 400 })

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('subject, preview_text, body_markdown')
    .eq('id', id)
    .single()
  if (error || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Pull the caller's name for merge-token preview
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const outcome = await sendCampaignEmail({
    to: recipient,
    recipientName: profile?.name ?? null,
    subject: `[TEST] ${campaign.subject || '(no subject)'}`,
    bodyMarkdown: campaign.body_markdown,
    previewText: campaign.preview_text,
  })

  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 500 })
}
