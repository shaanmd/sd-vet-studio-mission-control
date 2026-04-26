'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export type MeetingType = 'cofounder' | 'client' | 'lead' | 'investor' | 'mentor' | 'other'
export type MeetingStatus = 'upcoming' | 'completed' | 'cancelled'

export interface ActionItem {
  id: string
  text: string
  done: boolean
  assignee?: string
}

export type Recurrence = 'weekly' | 'fortnightly' | 'monthly'

export interface Meeting {
  id: string
  title: string
  meeting_type: MeetingType
  scheduled_at: string
  status: MeetingStatus
  recurrence: Recurrence | null
  attendees: string[]
  agenda: string | null
  notes: string | null
  action_items: ActionItem[]
  drive_transcript_url: string | null
  ai_summary: string | null
  linked_project_id: string | null
  project?: { id: string; name: string; emoji: string } | null
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  weekly: '🔁 Weekly',
  fortnightly: '🔁 Fortnightly',
  monthly: '📆 Monthly',
}

function nextOccurrence(iso: string, recurrence: Recurrence): string {
  const d = new Date(iso)
  if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'fortnightly') d.setDate(d.getDate() + 14)
  else d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

interface Props {
  meetings: Meeting[]
  projects: { id: string; name: string; emoji: string }[]
}

const TYPE_LABELS: Record<MeetingType, string> = {
  cofounder: '🤝 Co-founder',
  client: '💼 Client',
  lead: '🎯 Lead',
  investor: '💰 Investor',
  mentor: '🧠 Mentor',
  other: '📅 Other',
}

const TYPE_COLORS: Record<MeetingType, { bg: string; color: string }> = {
  cofounder: { bg: '#E8F1EE', color: '#1E6B5E' },
  client:    { bg: '#E5EEF7', color: '#3A6C98' },
  lead:      { bg: '#FDE8F7', color: '#8B2EB0' },
  investor:  { bg: '#F5E7C8', color: '#8A5A1E' },
  mentor:    { bg: '#EEE8F6', color: '#6B4E94' },
  other:     { bg: '#F3F4F6', color: '#6B7A82' },
}

const FILTERS: Array<{ value: 'all' | MeetingType; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'cofounder', label: '🤝 Co-founder' },
  { value: 'client', label: '💼 Client' },
  { value: 'lead', label: '🎯 Lead' },
  { value: 'investor', label: '💰 Investor' },
  { value: 'mentor', label: '🧠 Mentor' },
]

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })
}

function weekLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const startOfThisWeek = new Date(now); startOfThisWeek.setDate(now.getDate() - now.getDay())
  startOfThisWeek.setHours(0,0,0,0)
  const startOfNextWeek = new Date(startOfThisWeek); startOfNextWeek.setDate(startOfThisWeek.getDate() + 7)
  const startOfLastWeek = new Date(startOfThisWeek); startOfLastWeek.setDate(startOfThisWeek.getDate() - 7)

  if (d >= startOfNextWeek) return 'Upcoming'
  if (d >= startOfThisWeek) return 'This week'
  if (d >= startOfLastWeek) return 'Last week'
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function isUpcoming(iso: string) {
  return new Date(iso) >= new Date()
}

// ─── New Meeting Modal ─────────────────────────────────────────────────────
function NewMeetingModal({ projects, onClose, onSave }: {
  projects: Props['projects']
  onClose: () => void
  onSave: (m: Meeting) => void
}) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MeetingType>('cofounder')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [attendeeInput, setAttendeeInput] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addAttendee() {
    const val = attendeeInput.trim()
    if (val && !attendees.includes(val)) setAttendees(prev => [...prev, val])
    setAttendeeInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title required'); return }
    if (!date) { setError('Date required'); return }
    setSaving(true)
    const scheduled_at = new Date(`${date}T${time}`).toISOString()
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), meeting_type: type, scheduled_at, recurrence: recurrence || null, attendees, linked_project_id: projectId || null }),
    })
    if (!res.ok) { setError('Failed to create'); setSaving(false); return }
    const data = await res.json()
    onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#1E2A35' }}>New Meeting</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Meeting title…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#6B7A82' }}>Type</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(TYPE_LABELS) as MeetingType[]).map(t => (
                  <button key={t} type="button" onClick={() => setType(t)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={type === t ? { background: '#1E6B5E', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82' }}>
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6B7A82' }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#6B7A82' }}>Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#6B7A82' }}>Repeats</label>
              <div className="flex gap-1.5 flex-wrap">
                {(['', 'weekly', 'fortnightly', 'monthly'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRecurrence(r)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                    style={recurrence === r ? { background: '#1E6B5E', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82' }}>
                    {r === '' ? 'No repeat' : RECURRENCE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#6B7A82' }}>Attendees</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {attendees.map(a => (
                  <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                    style={{ background: '#E8F1EE', color: '#1E6B5E' }}>
                    {a}
                    <button type="button" onClick={() => setAttendees(prev => prev.filter(x => x !== a))}
                      className="leading-none" style={{ color: '#9AA5AC' }}>×</button>
                  </span>
                ))}
              </div>
              <input
                value={attendeeInput}
                onChange={e => setAttendeeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } }}
                placeholder="Type name and press Enter…"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1 block" style={{ color: '#6B7A82' }}>Linked project (optional)</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30">
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#1E6B5E' }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Meeting Detail Panel ──────────────────────────────────────────────────
function MeetingDetail({ meeting, projects, onUpdate, onDelete }: {
  meeting: Meeting
  projects: Props['projects']
  onUpdate: (m: Meeting) => void
  onDelete: (id: string) => void
}) {
  const [tab, setTab] = useState<'agenda' | 'notes' | 'transcript'>('agenda')
  const [editingAgenda, setEditingAgenda] = useState(false)
  const [agenda, setAgenda] = useState(meeting.agenda ?? '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [attendees, setAttendees] = useState<string[]>(meeting.attendees ?? [])
  const [attendeeInput, setAttendeeInput] = useState('')

  async function addAttendee() {
    const val = attendeeInput.trim()
    if (!val || attendees.includes(val)) { setAttendeeInput(''); return }
    const updated = [...attendees, val]
    setAttendees(updated)
    setAttendeeInput('')
    await patch({ attendees: updated })
  }

  async function removeAttendee(name: string) {
    const updated = attendees.filter(a => a !== name)
    setAttendees(updated)
    await patch({ attendees: updated })
  }
  const [notes, setNotes] = useState(meeting.notes ?? '')
  const [driveUrl, setDriveUrl] = useState(meeting.drive_transcript_url ?? '')
  const [editingDrive, setEditingDrive] = useState(false)
  const [newActionText, setNewActionText] = useState('')
  const [saving, setSaving] = useState(false)

  const tc = TYPE_COLORS[meeting.meeting_type]

  async function patch(body: Partial<Meeting>) {
    setSaving(true)
    await fetch(`/api/meetings/${meeting.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    onUpdate({ ...meeting, ...body })
  }

  async function toggleActionItem(item: ActionItem) {
    const updated = meeting.action_items.map(a => a.id === item.id ? { ...a, done: !a.done } : a)
    await patch({ action_items: updated })
  }

  async function addActionItem() {
    if (!newActionText.trim()) return
    const item: ActionItem = { id: crypto.randomUUID(), text: newActionText.trim(), done: false }
    const updated = [...meeting.action_items, item]
    await patch({ action_items: updated })
    setNewActionText('')
  }

  async function deleteActionItem(id: string) {
    const updated = meeting.action_items.filter(a => a.id !== id)
    await patch({ action_items: updated })
  }

  async function sendToTasks(item: ActionItem) {
    if (!meeting.linked_project_id) {
      alert('Link this meeting to a project first (edit the meeting) to send action items to tasks.')
      return
    }
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.text,
        project_id: meeting.linked_project_id,
        energy: null,
      }),
    })
    // Mark the action item as done so it's clear it's been captured
    await toggleActionItem(item)
  }

  async function markComplete() {
    await patch({ status: 'completed' })
    if (meeting.recurrence) {
      const next = nextOccurrence(meeting.scheduled_at, meeting.recurrence)
      const label = RECURRENCE_LABELS[meeting.recurrence]
      if (confirm(`Create next ${label.replace(/^[^ ]+ /, '')} occurrence on ${formatDate(next)}?`)) {
        const res = await fetch('/api/meetings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: meeting.title,
            meeting_type: meeting.meeting_type,
            scheduled_at: next,
            recurrence: meeting.recurrence,
            linked_project_id: meeting.linked_project_id,
          }),
        })
        if (res.ok) {
          const created = await res.json()
          onUpdate({ ...meeting, status: 'completed' })
          // surface new meeting by triggering parent refresh
          window.location.reload()
          return
        }
      }
    }
  }

  const upcoming = isUpcoming(meeting.scheduled_at)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4" style={{ borderBottom: '1px solid #EFEAE0' }}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-bold leading-snug" style={{ color: '#1E2A35', fontFamily: 'Georgia, serif' }}>
              {meeting.title}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                {TYPE_LABELS[meeting.meeting_type]}
              </span>
              <span className="text-[12px]" style={{ color: '#6B7A82' }}>
                {formatDate(meeting.scheduled_at)} · {formatTime(meeting.scheduled_at)}
              </span>
              {meeting.recurrence && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#F5E7C8', color: '#8A5A1E' }}>
                  {RECURRENCE_LABELS[meeting.recurrence]}
                </span>
              )}
              {meeting.project && (
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#6B7A82' }}>
                  {meeting.project.emoji} {meeting.project.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {upcoming && meeting.status === 'upcoming' && (
              <button onClick={markComplete} className="text-[11px] px-2.5 py-1 rounded-lg font-semibold"
                style={{ background: '#E8F1EE', color: '#1E6B5E' }}>
                ✓ Done
              </button>
            )}
            {meeting.status === 'completed' && (
              <span className="text-[11px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: '#E8F1EE', color: '#1E6B5E' }}>
                ✓ Completed
              </span>
            )}
            <button onClick={() => onDelete(meeting.id)} className="text-[11px] px-2 py-1 rounded-lg"
              style={{ color: '#C0392B' }}>
              Delete
            </button>
          </div>
        </div>

        {/* Attendees */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
          <span className="text-[11px] font-semibold shrink-0" style={{ color: '#9AA5AC' }}>👥</span>
          {attendees.map(a => (
            <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
              style={{ background: '#E8F1EE', color: '#1E6B5E' }}>
              {a}
              <button onClick={() => removeAttendee(a)} className="leading-none" style={{ color: '#9AA5AC' }}>×</button>
            </span>
          ))}
          <input
            value={attendeeInput}
            onChange={e => setAttendeeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAttendee() } if (e.key === 'Escape') setAttendeeInput('') }}
            placeholder={attendees.length === 0 ? 'Add attendees…' : '+'}
            className="text-[11px] focus:outline-none bg-transparent min-w-0"
            style={{ color: '#6B7A82', width: attendees.length === 0 ? 120 : 40 }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mt-3">
          {([['agenda', 'Agenda'], ['notes', 'Notes'], ['transcript', 'Transcript']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
              style={tab === t ? { background: '#1E6B5E', color: '#fff' } : { color: '#6B7A82' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* ── Agenda tab ── */}
        {tab === 'agenda' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#FBF7EF', borderBottom: '1px solid #E8E2D6' }}>
                <span className="text-[12px] font-bold" style={{ color: '#1E2A35' }}>📋 Agenda</span>
                {!editingAgenda && (
                  <button onClick={() => setEditingAgenda(true)} className="text-[11px]" style={{ color: '#1E6B5E' }}>
                    {agenda ? 'Edit' : '+ Add'}
                  </button>
                )}
              </div>
              {editingAgenda ? (
                <div className="p-3 flex flex-col gap-2">
                  <textarea
                    autoFocus value={agenda}
                    onChange={e => setAgenda(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingAgenda(false) }}
                    placeholder="Agenda items… (one per line)"
                    rows={6}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={async () => { await patch({ agenda: agenda || null }); setEditingAgenda(false) }}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                      style={{ background: '#1E6B5E' }}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditingAgenda(false)} className="text-[12px] text-gray-400 px-2">Cancel</button>
                  </div>
                </div>
              ) : agenda ? (
                <div className="px-4 py-3">
                  {agenda.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      <span className="text-[12px] font-bold shrink-0 mt-0.5" style={{ color: '#D4A853' }}>{i + 1}.</span>
                      <span className="text-[13px]" style={{ color: '#2A3A48' }}>{line}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="px-4 py-3 text-[13px] italic" style={{ color: '#9AA5AC' }}>
                  No agenda yet — click Add to write one.
                </p>
              )}
            </div>

            {/* Action items */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
              <div className="px-4 py-2.5" style={{ background: '#FBF7EF', borderBottom: '1px solid #E8E2D6' }}>
                <span className="text-[12px] font-bold" style={{ color: '#1E2A35' }}>
                  ✅ Action items
                  {meeting.action_items.length > 0 && (
                    <span className="ml-1.5 font-normal" style={{ color: '#9AA5AC' }}>
                      ({meeting.action_items.filter(a => a.done).length}/{meeting.action_items.length})
                    </span>
                  )}
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: '#F5F0E8' }}>
                {meeting.action_items.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 px-4 py-2.5 group">
                    <button onClick={() => toggleActionItem(item)}
                      className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                      style={item.done ? { background: '#1E6B5E', borderColor: '#1E6B5E' } : { borderColor: '#CBD5E1' }}>
                      {item.done && <span className="text-[9px] text-white">✓</span>}
                    </button>
                    <span className="flex-1 text-[13px]"
                      style={{ color: item.done ? '#9AA5AC' : '#2A3A48', textDecoration: item.done ? 'line-through' : 'none' }}>
                      {item.text}
                    </span>
                    <button onClick={() => sendToTasks(item)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold px-1.5 py-0.5 rounded transition-opacity"
                      style={{ color: '#1E6B5E', background: '#E8F1EE' }}
                      title="Send to project tasks">
                      → Task
                    </button>
                    <button onClick={() => deleteActionItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity"
                      style={{ color: '#C0392B' }}>✕</button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderTop: meeting.action_items.length ? '1px solid #F5F0E8' : 'none' }}>
                <input
                  value={newActionText}
                  onChange={e => setNewActionText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addActionItem() }}
                  placeholder="Add action item…"
                  className="flex-1 text-[13px] focus:outline-none bg-transparent"
                  style={{ color: '#2A3A48' }}
                />
                {newActionText && (
                  <button onClick={addActionItem} className="text-[11px] font-semibold px-2 py-1 rounded" style={{ color: '#1E6B5E' }}>Add</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Notes tab ── */}
        {tab === 'notes' && (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{ background: '#FBF7EF', borderBottom: '1px solid #E8E2D6' }}>
              <span className="text-[12px] font-bold" style={{ color: '#1E2A35' }}>📝 Notes</span>
              {!editingNotes && (
                <button onClick={() => setEditingNotes(true)} className="text-[11px]" style={{ color: '#1E6B5E' }}>
                  {notes ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="p-3 flex flex-col gap-2">
                <textarea
                  autoFocus value={notes}
                  onChange={e => setNotes(e.target.value)}
                  onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { patch({ notes: notes || null }); setEditingNotes(false) } if (e.key === 'Escape') setEditingNotes(false) }}
                  placeholder="Meeting notes…"
                  rows={10}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
                <div className="flex gap-2">
                  <button onClick={async () => { await patch({ notes: notes || null }); setEditingNotes(false) }}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                    style={{ background: '#1E6B5E' }}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingNotes(false)} className="text-[12px] text-gray-400 px-2">Cancel</button>
                </div>
                <p className="text-[10px]" style={{ color: '#9AA5AC' }}>⌘Enter to save · Esc to cancel</p>
              </div>
            ) : notes ? (
              <div className="px-4 py-3 cursor-pointer" onClick={() => setEditingNotes(true)}>
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#2A3A48' }}>{notes}</p>
              </div>
            ) : (
              <button onClick={() => setEditingNotes(true)} className="w-full px-4 py-4 text-left text-[13px] italic" style={{ color: '#9AA5AC' }}>
                Click to add notes…
              </button>
            )}
          </div>
        )}

        {/* ── Transcript tab ── */}
        {tab === 'transcript' && (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl p-4" style={{ background: '#FBF7EF', border: '1px solid #E8E2D6' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">📄</span>
                <span className="text-[13px] font-semibold" style={{ color: '#1E2A35' }}>Google Meet Transcript</span>
              </div>
              <p className="text-[12px] mb-3" style={{ color: '#6B7A82' }}>
                Paste the Google Drive link to the meeting transcript from Google Meet.
              </p>
              {editingDrive ? (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    value={driveUrl}
                    onChange={e => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={async () => { await patch({ drive_transcript_url: driveUrl || null }); setEditingDrive(false) }}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
                      style={{ background: '#1E6B5E' }}>
                      {saving ? 'Saving…' : 'Save link'}
                    </button>
                    <button onClick={() => setEditingDrive(false)} className="text-[12px] text-gray-400 px-2">Cancel</button>
                  </div>
                </div>
              ) : meeting.drive_transcript_url ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#D4F0EE', color: '#1E6B5E' }}>
                    ✓ Linked
                  </span>
                  <a href={meeting.drive_transcript_url} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] font-semibold underline flex-1 truncate" style={{ color: '#1E6B5E' }}>
                    Open in Drive ↗
                  </a>
                  <button onClick={() => setEditingDrive(true)} className="text-[11px]" style={{ color: '#9AA5AC' }}>Edit</button>
                </div>
              ) : (
                <button onClick={() => setEditingDrive(true)}
                  className="w-full py-2 rounded-lg text-[12px] font-semibold border-2 border-dashed transition-colors"
                  style={{ borderColor: '#E8E2D6', color: '#9AA5AC' }}>
                  + Link Google Drive transcript
                </button>
              )}
            </div>

            {meeting.ai_summary && (
              <div className="rounded-xl p-4" style={{ border: '1px solid #E8E2D6' }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#9AA5AC' }}>AI Summary</div>
                <p className="text-[13px] whitespace-pre-wrap" style={{ color: '#2A3A48' }}>{meeting.ai_summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Transcripts Vault ────────────────────────────────────────────────────
function TranscriptsVault({ meetings }: { meetings: Meeting[] }) {
  const [search, setSearch] = useState('')
  const q = search.toLowerCase()

  const withTranscripts = meetings.filter(m =>
    m.drive_transcript_url || m.ai_summary
  ).filter(m =>
    !q || m.title.toLowerCase().includes(q) || (m.ai_summary ?? '').toLowerCase().includes(q)
  )

  const withoutLink = meetings.filter(m => m.status === 'completed' && !m.drive_transcript_url)

  return (
    <div className="flex flex-col gap-4">
      {/* Drive banner */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: '#F0FBF9', border: '1px solid #B2DDD8' }}>
        <span className="text-2xl shrink-0">📁</span>
        <div>
          <div className="text-[13px] font-semibold mb-0.5" style={{ color: '#1E6B5E' }}>Google Drive Transcript Vault</div>
          <p className="text-[12px]" style={{ color: '#6B7A82' }}>
            Link your Google Meet transcripts from Drive to each meeting. They'll appear here for easy search and reference.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
        <span style={{ color: '#CDC3AE' }}>◎</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search transcripts…"
          className="flex-1 text-[13px] focus:outline-none bg-transparent"
          style={{ color: '#1E2A35' }}
        />
        {search && <button onClick={() => setSearch('')} style={{ color: '#9AA5AC' }}>×</button>}
      </div>

      {/* Transcripts list */}
      {withTranscripts.length === 0 && !q ? (
        <div className="rounded-xl py-10 text-center" style={{ border: '1px dashed #E8E2D6' }}>
          <p className="text-[13px]" style={{ color: '#9AA5AC' }}>No transcripts linked yet.</p>
          <p className="text-[12px] mt-1" style={{ color: '#9AA5AC' }}>Open a completed meeting and link its Drive transcript.</p>
        </div>
      ) : withTranscripts.length === 0 ? (
        <p className="text-[13px] text-center py-6" style={{ color: '#9AA5AC' }}>No transcripts match "{search}"</p>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
          {withTranscripts.map((m, i) => {
            const tc = TYPE_COLORS[m.meeting_type]
            return (
              <div key={m.id} className="px-4 py-3 flex items-start gap-3"
                style={{ borderBottom: i < withTranscripts.length - 1 ? '1px solid #F5F0E8' : 'none' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[13px] font-semibold" style={{ color: '#1E2A35' }}>{m.title}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                      {TYPE_LABELS[m.meeting_type]}
                    </span>
                  </div>
                  <div className="text-[11px] mb-1.5" style={{ color: '#9AA5AC' }}>
                    {formatDate(m.scheduled_at)}
                  </div>
                  {m.ai_summary && (
                    <p className="text-[12px] line-clamp-2" style={{ color: '#6B7A82' }}>{m.ai_summary}</p>
                  )}
                </div>
                {m.drive_transcript_url && (
                  <a href={m.drive_transcript_url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: '#E8F1EE', color: '#1E6B5E' }}>
                    Open ↗
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unlinked completed meetings */}
      {withoutLink.length > 0 && !q && (
        <div>
          <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: '#9AA5AC' }}>
            Completed — no transcript linked ({withoutLink.length})
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px dashed #E8E2D6' }}>
            {withoutLink.map((m, i) => (
              <div key={m.id} className="px-4 py-2.5 flex items-center gap-2"
                style={{ borderBottom: i < withoutLink.length - 1 ? '1px solid #F5F0E8' : 'none' }}>
                <span className="text-[13px] flex-1" style={{ color: '#9AA5AC' }}>{m.title}</span>
                <span className="text-[11px]" style={{ color: '#9AA5AC' }}>{formatDate(m.scheduled_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function MeetingsClient({ meetings: initialMeetings, projects }: Props) {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)
  const [typeFilter, setTypeFilter] = useState<'all' | MeetingType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(initialMeetings[0]?.id ?? null)
  const [mainTab, setMainTab] = useState<'meetings' | 'transcripts'>('meetings')
  const [showNew, setShowNew] = useState(false)

  const filtered = useMemo(() =>
    meetings.filter(m => typeFilter === 'all' || m.meeting_type === typeFilter),
    [meetings, typeFilter]
  )

  // Group by week label — upcoming first (soonest first), then past (most recent first)
  const grouped = useMemo(() => {
    const now = new Date()
    const upcoming = filtered
      .filter(m => new Date(m.scheduled_at) >= now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    const past = filtered
      .filter(m => new Date(m.scheduled_at) < now)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
    const sorted = [...upcoming, ...past]

    const groups: { label: string; items: Meeting[] }[] = []
    const seen = new Map<string, Meeting[]>()
    for (const m of sorted) {
      const label = weekLabel(m.scheduled_at)
      if (!seen.has(label)) { seen.set(label, []); groups.push({ label, items: seen.get(label)! }) }
      seen.get(label)!.push(m)
    }
    return groups
  }, [filtered])

  const selected = meetings.find(m => m.id === selectedId) ?? null

  // Stats
  const now = new Date()
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - now.getDay()); thisWeekStart.setHours(0,0,0,0)
  const thisWeekEnd = new Date(thisWeekStart); thisWeekEnd.setDate(thisWeekStart.getDate() + 7)
  const thisWeekCount = meetings.filter(m => { const d = new Date(m.scheduled_at); return d >= thisWeekStart && d < thisWeekEnd }).length
  const nextUp = meetings.filter(m => m.status === 'upcoming' && new Date(m.scheduled_at) > now).sort((a,b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
  const openActions = meetings.reduce((sum, m) => sum + m.action_items.filter(a => !a.done).length, 0)

  function handleSaveNew(m: Meeting) {
    setMeetings(prev => [m, ...prev])
    setSelectedId(m.id)
    setShowNew(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
    setMeetings(prev => prev.filter(m => m.id !== id))
    setSelectedId(meetings.find(m => m.id !== id)?.id ?? null)
    router.refresh()
  }

  function handleUpdate(updated: Meeting) {
    setMeetings(prev => prev.map(m => m.id === updated.id ? updated : m))
    router.refresh()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Stats strip */}
      <div className="flex items-center gap-6 px-7 py-3 shrink-0" style={{ background: '#FBF7EF', borderBottom: '1px solid #E8E2D6' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9AA5AC' }}>This week</span>
          <span className="text-[16px] font-bold" style={{ color: '#1E2A35' }}>{thisWeekCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9AA5AC' }}>Next up</span>
          <span className="text-[13px] font-semibold truncate max-w-[160px]" style={{ color: nextUp ? '#D4A853' : '#9AA5AC' }}>
            {nextUp ? nextUp.title : '—'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9AA5AC' }}>Open actions</span>
          <span className="text-[16px] font-bold" style={{ color: openActions > 0 ? '#C0392B' : '#9AA5AC' }}>{openActions}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setMainTab('meetings')}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
            style={mainTab === 'meetings' ? { background: '#1E6B5E', color: '#fff' } : { color: '#6B7A82' }}>
            Meetings
          </button>
          <button
            onClick={() => setMainTab('transcripts')}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors"
            style={mainTab === 'transcripts' ? { background: '#1E6B5E', color: '#fff' } : { color: '#6B7A82' }}>
            📄 Transcripts
          </button>
        </div>
      </div>

      {mainTab === 'transcripts' ? (
        <div className="flex-1 overflow-y-auto px-7 py-5">
          <TranscriptsVault meetings={meetings} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left pane — meeting list */}
          <div className="w-[320px] shrink-0 flex flex-col overflow-hidden" style={{ borderRight: '1px solid #E8E2D6' }}>
            {/* Filter pills + New button */}
            <div className="px-4 py-3 flex flex-col gap-2 shrink-0" style={{ borderBottom: '1px solid #EFEAE0' }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold" style={{ color: '#1E2A35' }}>
                  {filtered.length} meeting{filtered.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => setShowNew(true)}
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: '#1E6B5E', color: '#fff' }}>
                  + New
                </button>
              </div>
              <div className="flex gap-1 flex-wrap">
                {FILTERS.map(f => (
                  <button key={f.value} onClick={() => setTypeFilter(f.value)}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors"
                    style={typeFilter === f.value
                      ? { background: '#1E6B5E', color: '#fff' }
                      : { background: '#F5F0E8', color: '#6B7A82' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped list */}
            <div className="flex-1 overflow-y-auto">
              {grouped.length === 0 && (
                <p className="px-4 py-8 text-center text-[13px]" style={{ color: '#9AA5AC' }}>No meetings yet.</p>
              )}
              {grouped.map(group => (
                <div key={group.label}>
                  <div className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider sticky top-0"
                    style={{ color: '#9AA5AC', background: '#FBF7EF', borderBottom: '1px solid #EFEAE0' }}>
                    {group.label}
                  </div>
                  {group.items.map(m => {
                    const tc = TYPE_COLORS[m.meeting_type]
                    const isSelected = m.id === selectedId
                    const soon = isUpcoming(m.scheduled_at) && m.status === 'upcoming'
                    return (
                      <button key={m.id} onClick={() => setSelectedId(m.id)}
                        className="w-full text-left px-4 py-3 transition-colors"
                        style={{
                          background: isSelected ? '#E8F1EE' : 'transparent',
                          borderBottom: '1px solid #F5F0E8',
                        }}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              {soon && <span style={{ fontSize: 10 }}>🔥</span>}
                              <span className="text-[13px] font-semibold truncate" style={{ color: isSelected ? '#1E6B5E' : '#1E2A35' }}>
                                {m.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                                {TYPE_LABELS[m.meeting_type]}
                              </span>
                              <span className="text-[11px]" style={{ color: '#9AA5AC' }}>
                                {formatDate(m.scheduled_at)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                              {m.recurrence && (
                                <span className="text-[10px]" style={{ color: '#8A5A1E' }}>
                                  {RECURRENCE_LABELS[m.recurrence]}
                                </span>
                              )}
                              {m.action_items.filter(a => !a.done).length > 0 && (
                                <span className="text-[10px]" style={{ color: '#C0392B' }}>
                                  {m.action_items.filter(a => !a.done).length} open action{m.action_items.filter(a => !a.done).length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          {m.drive_transcript_url && (
                            <span className="text-[10px] shrink-0 mt-0.5" style={{ color: '#1E6B5E' }}>📄</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right pane — detail */}
          <div className="flex-1 overflow-hidden">
            {selected ? (
              <MeetingDetail
                key={selected.id}
                meeting={selected}
                projects={projects}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-[32px] mb-2">📅</p>
                  <p className="text-[14px]" style={{ color: '#9AA5AC' }}>Select a meeting or create a new one.</p>
                  <button onClick={() => setShowNew(true)}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: '#1E6B5E' }}>
                    + New Meeting
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showNew && (
        <NewMeetingModal projects={projects} onClose={() => setShowNew(false)} onSave={handleSaveNew} />
      )}
    </div>
  )
}
