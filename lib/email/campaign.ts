// lib/email/campaign.ts
// Renders a campaign's markdown body into the branded HTML email shell and
// fires it via Resend. Used by the test-send and the real-send routes.

import { Resend } from 'resend'
import { marked } from 'marked'

interface RenderOpts {
  recipientName?: string | null
  unsubscribeUrl?: string
}

const FROM_DEFAULT = 'Mission Control <noreply@sdvetstudio.com>'

/** Replaces {{first_name}} / {{name}} merge tokens with the recipient's name. */
function applyMergeTokens(markdown: string, name: string | null | undefined): string {
  const display = (name ?? 'there').trim() || 'there'
  const firstName = display.split(' ')[0] || display
  return markdown
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*name\s*\}\}/gi, display)
}

/** Builds the full HTML email body — markdown body wrapped in branded shell. */
export function renderCampaignHtml(
  bodyMarkdown: string,
  subject: string,
  opts: RenderOpts = {},
): string {
  const merged = applyMergeTokens(bodyMarkdown, opts.recipientName)
  const innerHtml = marked.parse(merged, { async: false }) as string

  const unsubscribeBlock = opts.unsubscribeUrl
    ? `<p style="font-size:11px;color:#9AA5AC;margin:8px 0 0;">
         Don't want these? <a href="${opts.unsubscribeUrl}" style="color:#9AA5AC;text-decoration:underline;">Unsubscribe</a>
       </p>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0D2035;">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E8E2D6;">
    <div style="padding:28px 32px;font-size:15px;line-height:1.65;">
      <style>
        .mc-content h1 { font-size:22px; font-weight:700; color:#0D2035; margin:24px 0 12px; }
        .mc-content h2 { font-size:18px; font-weight:700; color:#0D2035; margin:20px 0 10px; }
        .mc-content h3 { font-size:16px; font-weight:600; color:#0D2035; margin:16px 0 8px; }
        .mc-content p  { margin:0 0 14px; }
        .mc-content a  { color:#1E6B5E; text-decoration:underline; }
        .mc-content ul, .mc-content ol { margin:0 0 14px; padding-left:22px; }
        .mc-content li { margin:4px 0; }
        .mc-content blockquote { border-left:3px solid #D4A853; margin:12px 0; padding:4px 14px; color:#6B7A82; font-style:italic; }
        .mc-content code { background:#F5F0E8; padding:2px 6px; border-radius:4px; font-size:13px; }
        .mc-content pre { background:#F5F0E8; padding:12px 14px; border-radius:8px; overflow-x:auto; }
        .mc-content hr { border:none; border-top:1px solid #E8E2D6; margin:20px 0; }
      </style>
      <div class="mc-content">${innerHtml}</div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #F5F0E8;background:#FBF7EF;">
      <p style="font-size:11px;color:#9AA5AC;margin:0;">SD VetStudio · sent with Mission Control</p>
      ${unsubscribeBlock}
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

export interface CampaignSendInput {
  to: string
  recipientName?: string | null
  subject: string
  bodyMarkdown: string
  previewText?: string | null
  /** Optional one-click unsubscribe link surfaced in the footer. */
  unsubscribeUrl?: string
  from?: string
}

export interface CampaignSendOutcome {
  ok: boolean
  messageId?: string
  error?: string
}

/** Fires a single campaign email via Resend. Returns ok + messageId or error. */
export async function sendCampaignEmail(input: CampaignSendInput): Promise<CampaignSendOutcome> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }

  const resend = new Resend(apiKey)
  const from = input.from ?? process.env.DAILY_DIGEST_FROM ?? FROM_DEFAULT
  const html = renderCampaignHtml(input.bodyMarkdown, input.subject, {
    recipientName: input.recipientName,
    unsubscribeUrl: input.unsubscribeUrl,
  })

  try {
    const resp = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html,
    })
    if (resp?.error) {
      const e = resp.error as { name?: string; message?: string }
      return { ok: false, error: `${e.name ?? 'unknown'} — ${e.message ?? JSON.stringify(resp.error)}` }
    }
    return { ok: true, messageId: resp?.data?.id ?? undefined }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? String(err) }
  }
}
