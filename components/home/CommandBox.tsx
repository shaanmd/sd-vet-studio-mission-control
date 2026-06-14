'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ProposedAction, UndoEntry } from '@/lib/ai'

type Phase = 'idle' | 'interpreting' | 'preview' | 'applying' | 'done' | 'error'

export default function CommandBox() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [actions, setActions] = useState<ProposedAction[]>([])
  const [undoEntries, setUndoEntries] = useState<UndoEntry[]>([])
  const [note, setNote] = useState<string | null>(null)

  async function interpret() {
    if (!text.trim()) return
    setPhase('interpreting'); setNote(null)
    try {
      const res = await fetch('/api/ai/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error('Interpret failed')
      const data = await res.json() as { actions: ProposedAction[]; message: string | null }
      if (!data.actions.length) { setNote(data.message); setPhase('idle'); return }
      setActions(data.actions); setPhase('preview')
    } catch {
      setNote('Something went wrong interpreting that.'); setPhase('error')
    }
  }

  async function confirm() {
    setPhase('applying')
    try {
      const res = await fetch('/api/ai/command/apply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions }),
      })
      if (!res.ok) throw new Error('Apply failed')
      const data = await res.json() as { results: ({ ok: boolean; label: string; error?: string; undo?: UndoEntry })[] }
      const undos = data.results.filter(r => r.ok && r.undo).map(r => r.undo as UndoEntry)
      const failed = data.results.filter(r => !r.ok)
      setUndoEntries(undos)
      setNote(failed.length ? `${undos.length} applied, ${failed.length} failed.` : `${undos.length} applied.`)
      setPhase('done'); setText(''); setActions([]); router.refresh()
    } catch {
      setNote('Something went wrong applying that.'); setPhase('error')
    }
  }

  async function undo() {
    if (!undoEntries.length) return
    await fetch('/api/ai/command/undo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ undo: undoEntries }),
    })
    setUndoEntries([]); setNote('Undone.'); setPhase('idle'); router.refresh()
  }

  function cancel() { setActions([]); setPhase('idle') }

  return (
    <div className="rounded-2xl p-5 mb-5" style={{ background: '#fff', border: '1px solid #D9D2C2' }}>
      <div className="text-[11px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#6B7A82' }}>
        Quick capture
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && phase !== 'interpreting') interpret() }}
          disabled={phase === 'interpreting' || phase === 'applying'}
          placeholder="e.g. add a task to email the vet · summarise the Mockingbird project"
          className="flex-1 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2"
          style={{ border: '1px solid #E5DFD0', background: '#FAF8F2', color: '#2A3A48' }}
        />
        <button
          onClick={interpret}
          disabled={!text.trim() || phase === 'interpreting' || phase === 'applying'}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#1E6B5E' }}
        >
          {phase === 'interpreting' ? 'Reading…' : 'Go'}
        </button>
      </div>

      {note && phase !== 'preview' && (
        <div className="mt-3 text-[13px] flex items-center gap-3" style={{ color: '#6B7A82' }}>
          <span>{note}</span>
          {phase === 'done' && undoEntries.length > 0 && (
            <button onClick={undo} className="font-semibold underline" style={{ color: '#1E6B5E' }}>Undo</button>
          )}
        </div>
      )}

      {phase === 'preview' && (
        <div className="mt-4 flex flex-col gap-2">
          {actions.map((a, i) => (
            <div key={i} className="rounded-xl px-3.5 py-3 text-sm" style={{ background: '#FAF8F2', border: '1px solid #E5DFD0' }}>
              {a.kind === 'create_task' ? (
                <span>✅ New {a.target === 'project' ? `task on ${a.project_name}` : 'personal task'}: <strong>{a.title}</strong></span>
              ) : (
                <div>
                  <div className="font-semibold mb-1">📝 Update summary for {a.project_name}:</div>
                  <div style={{ color: '#2A3A48' }}>{a.summary}</div>
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <button onClick={confirm} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: '#1E6B5E' }}>
              Confirm
            </button>
            <button onClick={cancel} className="px-4 py-2 text-sm" style={{ color: '#9AA5AC' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
