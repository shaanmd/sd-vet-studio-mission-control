'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { marked } from 'marked'
import type { Campaign, NewsletterList } from '@/lib/types/database'
import EditListButton from './EditListButton'

interface ProjectOption { id: string; name: string; emoji: string | null }

type ListConfigWithProject = NewsletterList & {
  project?: { id: string; name: string; emoji: string | null } | null
}

interface Props {
  campaign: Campaign
  activeSubscriberCount: number
  perRecipientStats: { sent: number; failed: number } | null
  userEmail: string
  listConfig: ListConfigWithProject | null
  projects: ProjectOption[]
}

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  draft:   { label: 'Draft',   bg: '#F5F0E8', color: '#6B7A82' },
  sending: { label: 'Sending', bg: '#FBF3DE', color: '#B7791F' },
  sent:    { label: 'Sent',    bg: '#E8F4F0', color: '#1E6B5E' },
  failed:  { label: 'Failed',  bg: '#FDECEA', color: '#C0392B' },
}

const STARTER_MARKDOWN = `Hi {{first_name}},

Quick update — what we shipped this week:

- Foo
- Bar
- Baz

Click here for more: https://sdvetstudio.com

Cheers,
Shaan & Deb
`

function renderPreview(markdown: string, name = 'Jane'): string {
  const merged = (markdown || STARTER_MARKDOWN)
    .replace(/\{\{\s*first_name\s*\}\}/gi, name.split(' ')[0])
    .replace(/\{\{\s*name\s*\}\}/gi, name)
  return marked.parse(merged, { async: false }) as string
}

export default function CampaignComposer({ campaign, activeSubscriberCount, perRecipientStats, userEmail, listConfig, projects }: Props) {
  const router = useRouter()
  const isLocked = campaign.status === 'sending' || campaign.status === 'sent'

  const [subject, setSubject] = useState(campaign.subject)
  const [previewText, setPreviewText] = useState(campaign.preview_text ?? '')
  const [body, setBody] = useState(campaign.body_markdown || STARTER_MARKDOWN)
  const [dirty, setDirty] = useState(false)
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const [testEmail, setTestEmail] = useState(userEmail)
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mark dirty + auto-save after 1s of inactivity
  useEffect(() => {
    if (isLocked) return
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => { void handleSave() }, 1200)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, previewText, body])

  async function handleSave() {
    if (isLocked) return
    setSavingState('saving')
    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject,
        preview_text: previewText || null,
        body_markdown: body,
      }),
    })
    if (res.ok) {
      setSavingState('saved')
      setDirty(false)
      setTimeout(() => setSavingState('idle'), 1500)
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Save failed')
      setSavingState('error')
    }
  }

  async function handleTestSend() {
    setTestSending(true)
    setTestResult(null)
    // Save first to ensure latest content is what gets sent
    await handleSave()
    const res = await fetch(`/api/campaigns/${campaign.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ok) {
      setTestResult({ ok: true, message: `✓ Test sent to ${testEmail}` })
    } else {
      setTestResult({ ok: false, message: data.error ?? 'Test send failed' })
    }
    setTestSending(false)
  }

  async function handleRealSend() {
    if (!confirm(
      `Send this campaign to ${activeSubscriberCount} subscribers of "${campaign.list_name}"?\n\n` +
      `This cannot be undone.`,
    )) return
    setSending(true)
    setSendResult(null)
    await handleSave()
    const res = await fetch(`/api/campaigns/${campaign.id}/send`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ok) {
      setSendResult({ ok: true, message: `✓ Sent to ${data.sent} subscribers` })
      setTimeout(() => router.refresh(), 800)
    } else {
      const errMsg = data.error
        ? data.error
        : data.failed
          ? `Sent ${data.sent}/${data.recipient_count}, ${data.failed} failed`
          : 'Send failed'
      setSendResult({ ok: false, message: errMsg })
    }
    setSending(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this draft? This cannot be undone.')) return
    const res = await fetch(`/api/campaigns/${campaign.id}`, { method: 'DELETE' })
    if (res.ok) router.push('/marketing')
  }

  const pill = STATUS_PILL[campaign.status] ?? STATUS_PILL.draft
  const previewHtml = renderPreview(body)

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div
        className="rounded-2xl"
        style={{ background: '#fff', border: '1px solid #E8E2D6', padding: 18 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: pill.bg, color: pill.color,
            }}>
              {pill.label}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 999,
              background: '#F5F0E8', color: '#6B7A82',
            }}>
              📋 {campaign.list_name} · {activeSubscriberCount} active
            </span>
            {savingState === 'saving' && (
              <span style={{ fontSize: 11, color: '#9AA5AC' }}>Saving…</span>
            )}
            {savingState === 'saved' && (
              <span style={{ fontSize: 11, color: '#1E6B5E' }}>✓ Saved</span>
            )}
            {savingState === 'error' && (
              <span style={{ fontSize: 11, color: '#C0392B' }}>Save failed</span>
            )}
          </div>
          {!isLocked && (
            <button
              onClick={handleDelete}
              style={{
                fontSize: 12, color: '#C0392B', background: 'none',
                border: 'none', cursor: 'pointer', padding: '4px 8px',
              }}
            >
              Delete draft
            </button>
          )}
        </div>

        {perRecipientStats && (
          <div style={{ fontSize: 12, color: '#6B7A82' }}>
            {perRecipientStats.sent} sent
            {perRecipientStats.failed > 0 && ` · ${perRecipientStats.failed} failed`}
            {campaign.sent_at && ` · ${new Date(campaign.sent_at).toLocaleString('en-AU')}`}
          </div>
        )}

        {/* From / brand identity row */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #F5F0E8' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9AA5AC', letterSpacing: 1, textTransform: 'uppercase' }}>
              From
            </span>
            {listConfig ? (
              <>
                <code style={{ fontSize: 12, background: '#F5F0E8', padding: '2px 8px', borderRadius: 6, color: '#0D2035' }}>
                  {listConfig.from_name} &lt;{listConfig.from_email}&gt;
                </code>
                <span title="Brand primary" style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: listConfig.brand_primary, border: '1px solid #E8E2D6',
                }} />
                <span title="Brand accent" style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: listConfig.brand_accent, border: '1px solid #E8E2D6',
                }} />
                {listConfig.project && (
                  <span style={{
                    fontSize: 11, color: '#6B7A82',
                    background: '#FBF7EF', padding: '2px 8px', borderRadius: 999,
                    border: '1px solid #E8E2D6',
                  }}>
                    {listConfig.project.emoji ?? '📁'} {listConfig.project.name}
                  </span>
                )}
              </>
            ) : (
              <span style={{ fontSize: 12, color: '#B7791F' }}>
                ⚠️ List not yet configured — sender will fall back to defaults
              </span>
            )}
          </div>
          {listConfig && (
            <EditListButton mode="edit" list={listConfig} projects={projects} label="Edit list" />
          )}
        </div>
      </div>

      {/* Subject + preview text */}
      <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E8E2D6', padding: 16 }}>
        <label className="block mb-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#9AA5AC', letterSpacing: 1, textTransform: 'uppercase' }}>
          Subject line
        </label>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          disabled={isLocked}
          placeholder="What's this email about? (the subject line is the most important sentence in any email)"
          className="w-full text-[16px] font-semibold py-1 outline-none"
          style={{ border: 'none', background: 'transparent', color: '#0D2035' }}
        />
        <div style={{ borderTop: '1px solid #F5F0E8', margin: '10px 0' }} />
        <label className="block mb-1.5" style={{ fontSize: 11, fontWeight: 700, color: '#9AA5AC', letterSpacing: 1, textTransform: 'uppercase' }}>
          Preview text <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional · shows under subject in inbox)</span>
        </label>
        <input
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          disabled={isLocked}
          placeholder="A quick line that hooks them into opening"
          className="w-full text-[13px] py-1 outline-none"
          style={{ border: 'none', background: 'transparent', color: '#0D2035' }}
        />
      </div>

      {/* Editor + Preview side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E8E2D6', overflow: 'hidden' }}>
          <div style={{ background: '#FBF7EF', padding: '8px 14px', borderBottom: '1px solid #E8E2D6', fontSize: 11, fontWeight: 600, color: '#9AA5AC', letterSpacing: 1, textTransform: 'uppercase' }}>
            ✏️ Markdown
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            disabled={isLocked}
            spellCheck
            className="w-full p-4 outline-none resize-none"
            style={{
              minHeight: 480, fontSize: 13, lineHeight: 1.6,
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              border: 'none', background: '#fff', color: '#0D2035',
            }}
          />
          <div style={{ background: '#FBF7EF', padding: '6px 14px', borderTop: '1px solid #E8E2D6', fontSize: 10, color: '#9AA5AC' }}>
            Tokens: <code>{'{{first_name}}'}</code> · <code>{'{{name}}'}</code>
          </div>
        </div>

        <div className="rounded-2xl" style={{ background: '#F5F0E8', border: '1px solid #E8E2D6', overflow: 'hidden' }}>
          <div style={{ background: '#FBF7EF', padding: '8px 14px', borderBottom: '1px solid #E8E2D6', fontSize: 11, fontWeight: 600, color: '#9AA5AC', letterSpacing: 1, textTransform: 'uppercase' }}>
            👁 Preview <span style={{ fontWeight: 400, textTransform: 'none' }}>(rendered for "Jane Smith")</span>
          </div>
          {listConfig && (
            <div style={{ height: 5, background: listConfig.brand_primary }} />
          )}
          <div
            style={{
              padding: 22, fontSize: 14, lineHeight: 1.65,
              minHeight: 480, color: '#0D2035', overflow: 'auto',
              // Brand-color the inline links inside the preview
              ...(listConfig ? { ['--brand-primary' as any]: listConfig.brand_primary } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      {/* Action bar */}
      <div
        className="rounded-2xl flex items-center flex-wrap gap-3"
        style={{ background: '#fff', border: '1px solid #E8E2D6', padding: 16 }}
      >
        {!isLocked ? (
          <>
            <div className="flex items-center gap-2 flex-1 min-w-[260px]">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ border: '1px solid #E8E2D6', background: '#FBF7EF' }}
              />
              <button
                onClick={handleTestSend}
                disabled={testSending || !testEmail}
                className="rounded-lg px-3 py-2 text-[13px] font-semibold whitespace-nowrap"
                style={{
                  background: '#fff', color: '#1E6B5E',
                  border: '1px solid #1E6B5E',
                  opacity: testSending || !testEmail ? 0.5 : 1,
                  cursor: testSending ? 'wait' : 'pointer',
                }}
              >
                {testSending ? 'Sending…' : '📧 Test send'}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!dirty || savingState === 'saving'}
              className="rounded-lg px-3 py-2 text-[13px] font-medium"
              style={{
                background: '#fff', color: '#6B7A82', border: '1px solid #E8E2D6',
                opacity: !dirty ? 0.6 : 1,
              }}
            >
              💾 Save draft
            </button>
            <button
              onClick={handleRealSend}
              disabled={sending || !subject.trim() || !body.trim() || activeSubscriberCount === 0}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
              style={{
                background: sending ? '#9AA5AC' : '#1E6B5E',
                cursor: sending ? 'wait' : 'pointer',
                opacity: !subject.trim() || !body.trim() || activeSubscriberCount === 0 ? 0.5 : 1,
              }}
            >
              {sending ? 'Sending…' : `🚀 Send to ${activeSubscriberCount} subscribers`}
            </button>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#6B7A82' }}>
            This campaign is {campaign.status}. Editing is locked.
          </p>
        )}
      </div>

      {/* Result panels */}
      {testResult && (
        <div
          className="rounded-xl"
          style={{
            background: testResult.ok ? '#E8F4F0' : '#FDECEA',
            color: testResult.ok ? '#1E6B5E' : '#C0392B',
            padding: '10px 14px', fontSize: 13,
          }}
        >
          {testResult.message}
        </div>
      )}
      {sendResult && (
        <div
          className="rounded-xl"
          style={{
            background: sendResult.ok ? '#E8F4F0' : '#FDECEA',
            color: sendResult.ok ? '#1E6B5E' : '#C0392B',
            padding: '10px 14px', fontSize: 13,
          }}
        >
          {sendResult.message}
        </div>
      )}
      {error && (
        <div className="rounded-xl" style={{ background: '#FDECEA', color: '#C0392B', padding: '10px 14px', fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  )
}
