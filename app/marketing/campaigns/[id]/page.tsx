// app/marketing/campaigns/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import type { Campaign, NewsletterList } from '@/lib/types/database'
import CampaignComposer from '@/components/marketing/CampaignComposer'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignComposerPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (!campaign) notFound()

  // Active subscriber count for the campaign's list
  const { count: activeCount } = await supabase
    .from('newsletter_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('list_name', campaign.list_name)
    .is('unsubscribed_at', null)

  // List branding config (from-email + brand colors)
  const { data: listConfigData } = await supabase
    .from('newsletter_lists')
    .select('*, project:projects(id, name, emoji)')
    .eq('name', campaign.list_name)
    .maybeSingle()
  const listConfig = listConfigData as (NewsletterList & { project?: { id: string; name: string; emoji: string | null } | null }) | null

  const projectsRes = await supabase
    .from('projects')
    .select('id, name, emoji')
    .order('name')
  const projects = (projectsRes.data ?? []).map((p: any) => ({ id: p.id, name: p.name, emoji: p.emoji ?? null }))

  // Per-recipient send/fail counts for the header status line
  let perRecipientStats: { sent: number; failed: number } | null = null
  let firstResendMessageId: string | null = null
  if (campaign.status === 'sent' || campaign.status === 'failed' || campaign.status === 'sending') {
    const { count: sent } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'sent')
    const { count: failed } = await supabase
      .from('campaign_sends')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', id)
      .eq('status', 'failed')
    perRecipientStats = { sent: sent ?? 0, failed: failed ?? 0 }

    // First Resend message id — used to deep-link to Resend's dashboard
    const { data: firstSend } = await supabase
      .from('campaign_sends')
      .select('resend_message_id')
      .eq('campaign_id', id)
      .not('resend_message_id', 'is', null)
      .order('sent_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    firstResendMessageId = firstSend?.resend_message_id ?? null
  }

  return (
    <>
      <TopBar crumbs={['Marketing', campaign.subject || 'Untitled campaign']} />
      <div style={{ padding: '22px 28px', paddingBottom: 60, maxWidth: 1100, margin: '0 auto' }}>
        <CampaignComposer
          campaign={campaign as Campaign}
          activeSubscriberCount={activeCount ?? 0}
          perRecipientStats={perRecipientStats}
          userEmail={user.email ?? ''}
          listConfig={listConfig}
          projects={projects}
          firstResendMessageId={firstResendMessageId}
        />
      </div>
    </>
  )
}
