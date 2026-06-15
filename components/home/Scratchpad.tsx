'use client'
import { useState, useEffect, useRef } from 'react'

interface Props {
  initialText: string
}

export default function Scratchpad({ initialText }: Props) {
  const [text, setText] = useState(initialText)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef(initialText)

  useEffect(() => {
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [])

  function handleChange(value: string) {
    setText(value)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save(value), 800)
  }

  async function save(value: string) {
    if (value === lastSaved.current) return
    setStatus('saving')
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'home_scratchpad', value }),
    })
    lastSaved.current = value
    setStatus('saved')
    setTimeout(() => setStatus('idle'), 1500)
  }

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid #D9D2C2' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#6B7A82' }}>
          Scratchpad
        </div>
        <span className="text-[11px] font-medium" style={{ color: '#9AA5AC' }}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : ''}
        </span>
      </div>
      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        onBlur={() => save(text)}
        placeholder="Brain dump, quick notes, anything…"
        rows={5}
        className="w-full resize-y rounded-xl px-3.5 py-3 text-sm leading-relaxed outline-none focus:ring-2"
        style={{ border: '1px solid #E5DFD0', background: '#FAF8F2', color: '#2A3A48' }}
      />
    </div>
  )
}
