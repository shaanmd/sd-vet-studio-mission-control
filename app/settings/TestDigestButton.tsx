'use client'

import { useState } from 'react'

export default function TestDigestButton() {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleClick() {
    if (!confirm('Send a test daily digest now to Shaan and Deb?')) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/email/daily-digest/test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setResult({ ok: false, message: data.error ?? 'Failed to send' })
      } else {
        const ok = (data.results ?? []).every((r: any) => r.status === 'sent')
        const summary = (data.results ?? []).map((r: any) => `${r.name}: ${r.status}`).join(' · ')
        setResult({ ok, message: summary || 'Sent' })
      }
    } catch (err: any) {
      setResult({ ok: false, message: err?.message ?? 'Network error' })
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
        <p
          className="text-[12px]"
          style={{
            color: result.ok ? '#1E6B5E' : '#C0392B',
            background: result.ok ? '#E8F4F0' : '#FDECEA',
            padding: '8px 12px',
            borderRadius: 8,
          }}
        >
          {result.ok ? '✓ ' : '✗ '}{result.message}
        </p>
      )}
    </div>
  )
}
