'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Meeting, MeetingType, Recurrence } from '@/components/meetings/MeetingsClient'

const TYPE_LABELS: Record<MeetingType, string> = {
  cofounder: '🤝 Co-founder',
  client: '💼 Client',
  lead: '🎯 Lead',
  investor: '💰 Investor',
  mentor: '🧠 Mentor',
  other: '📅 Other',
}

const RECURRENCE_LABELS: Record<Recurrence, string> = {
  weekly: '🔁 Weekly',
  fortnightly: '🔁 Fortnightly',
  monthly: '📆 Monthly',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })
}

interface Props {
  projectId: string
  projectName: string
  meetings: Meeting[]
}

export default function ProjectMeetingsList({ projectId, projectName, meetings: initialMeetings }: Props) {
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MeetingType>('cofounder')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('')
  const [saving, setSaving] = useState(false)

  const upcoming = meetings.filter(m => m.status === 'upcoming' && new Date(m.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  const past = meetings.filter(m => m.status === 'completed' || new Date(m.scheduled_at) < new Date())
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !date) return
    setSaving(true)
    const scheduled_at = new Date(`${date}T${time}`).toISOString()
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        meeting_type: type,
        scheduled_at,
        recurrence: recurrence || null,
        linked_project_id: projectId,
      }),
    })
    if (res.ok) {
      const m = await res.json()
      setMeetings(prev => [m, ...prev])
      setTitle(''); setDate(''); setTime('09:00'); setRecurrence(''); setAdding(false)
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #F5F0E8' }}>
        <span className="font-semibold text-[13px]" style={{ color: '#1E2A35' }}>
          Meetings <span style={{ color: '#9AA5AC', fontWeight: 400 }}>({meetings.length})</span>
        </span>
        <div className="flex items-center gap-2">
          <a href="/meetings" className="text-[11px]" style={{ color: '#9AA5AC' }}>View all ↗</a>
          <button onClick={() => setAdding(v => !v)} className="text-[12px] font-semibold" style={{ color: '#1E6B5E' }}>
            + Add
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="px-4 py-3 flex flex-col gap-2" style={{ borderBottom: '1px solid #F5F0E8' }}>
          <input
            autoFocus value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Meeting title…"
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30"
          />
          <div className="flex gap-2">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['cofounder', 'client', 'lead', 'investor', 'mentor', 'other'] as MeetingType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
                style={type === t ? { background: '#1E6B5E', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82' }}>
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap">
            {(['', 'weekly', 'fortnightly', 'monthly'] as const).map(r => (
              <button key={r} type="button" onClick={() => setRecurrence(r)}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
                style={recurrence === r ? { background: '#D4A853', color: '#fff' } : { background: '#F5F0E8', color: '#6B7A82' }}>
                {r === '' ? 'No repeat' : RECURRENCE_LABELS[r]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-[12px] text-gray-400">Cancel</button>
            <button type="submit" disabled={saving || !title.trim() || !date}
              className="flex-1 py-1.5 rounded-lg text-[12px] font-semibold text-white disabled:opacity-50"
              style={{ background: '#1E6B5E' }}>
              {saving ? 'Adding…' : 'Add meeting'}
            </button>
          </div>
        </form>
      )}

      {meetings.length === 0 && !adding && (
        <p className="px-4 py-4 text-[13px]" style={{ color: '#9AA5AC' }}>No meetings linked yet.</p>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9AA5AC', background: '#FDFAF2' }}>
            Upcoming
          </div>
          {upcoming.map((m, i) => (
            <MeetingRow key={m.id} meeting={m} isLast={i === upcoming.length - 1 && past.length === 0} isUpcoming />
          ))}
        </>
      )}

      {/* Past */}
      {past.length > 0 && (
        <>
          <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#9AA5AC', background: '#FBF7EF' }}>
            Past
          </div>
          {past.slice(0, 5).map((m, i) => (
            <MeetingRow key={m.id} meeting={m} isLast={i === Math.min(past.length, 5) - 1} isUpcoming={false} />
          ))}
          {past.length > 5 && (
            <a href="/meetings" className="block px-4 py-2.5 text-[11px] text-center" style={{ color: '#9AA5AC' }}>
              + {past.length - 5} more — view in Meetings ↗
            </a>
          )}
        </>
      )}
    </div>
  )
}

function MeetingRow({ meeting, isLast, isUpcoming }: { meeting: Meeting; isLast: boolean; isUpcoming: boolean }) {
  return (
    <a
      href="/meetings"
      className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-[#FDFAF2]"
      style={{ borderBottom: isLast ? 'none' : '1px solid #F5F0E8' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isUpcoming && <span style={{ fontSize: 10 }}>🔥</span>}
          <span className="text-[13px] font-semibold truncate" style={{ color: '#1E2A35' }}>{meeting.title}</span>
          {meeting.recurrence && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#F5E7C8', color: '#8A5A1E' }}>
              {RECURRENCE_LABELS[meeting.recurrence]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[11px]" style={{ color: '#9AA5AC' }}>
            {formatDate(meeting.scheduled_at)} · {formatTime(meeting.scheduled_at)}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#F5F0E8', color: '#6B7A82' }}>
            {TYPE_LABELS[meeting.meeting_type]}
          </span>
        </div>
        {meeting.action_items.filter(a => !a.done).length > 0 && (
          <span className="text-[10px]" style={{ color: '#C0392B' }}>
            {meeting.action_items.filter(a => !a.done).length} open action{meeting.action_items.filter(a => !a.done).length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {meeting.drive_transcript_url && <span className="text-[11px] shrink-0 mt-0.5">📄</span>}
    </a>
  )
}
