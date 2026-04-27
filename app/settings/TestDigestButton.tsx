'use client'

import { useState } from 'react'

export default function TestDigestButton() {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    lines: string[]
    env?: { has_resend_key: boolean; has_cron_secret: boolean; from: string }
  } | null>(null)

  async function handleClick() {
    if (!confirm('Send a test daily digest now to Shaan and Deb?')) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/email/daily-digest/test', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setResult({ ok: false, lines: [data.error ?? 'Failed to send'] })
        return
      }

      const results = (data.results ?? []) as Array<{ name: string; email: string; status: string }>
      const allSent = results.length > 0 && results.every(r => r.status === 'sent')
      const lines = results.length === 0
        ? ['No recipients processed — check the route logs']
        : results.map(r => `${r.name} (${r.email}): ${r.status}`)
      setResult({ ok: allSent, lines, env: data.env })
    } catch (err: any) {
      setResult({ ok: false, lines: [err?.message ?? 'Network error'] })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={sending}
        className="rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-colors"
        style={{
          background: sending ? '#9AA5AC' : '#1E6B5E',
          color: '#fff',
          border: 'none',
          cursor: sending ? 'wait' : 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        {sending ? 'Sending…' : '📧 Send test digest now'}
      </button>
      {result && (
        <div
          className="text-[12px]"
          style={{
            color: result.ok ? '#1E6B5E' : '#C0392B',
            background: result.ok ? '#E8F4F0' : '#FDECEA',
            padding: '8px 12px',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {result.lines.map((line, i) => (
            <div key={i}>
              {i === 0 && (result.ok ? '✓ ' : '✗ ')}{line}
            </div>
          ))}
          {result.env && (
            <div style={{ fontSize: 11, color: '#6B7A82', marginTop: 4 }}>
              from: <code>{result.env.from}</code>
              {' · '}RESEND_API_KEY: {result.env.has_resend_key ? '✓' : '✗ missing'}
              {' · '}CRON_SECRET: {result.env.has_cron_secret ? '✓' : '✗ missing'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
