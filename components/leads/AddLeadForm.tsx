'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InterestLevel } from '@/lib/types/database'

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  defaultProjectId?: string
  onClose: () => void
}

export default function AddLeadForm({ projects, defaultProjectId, onClose }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [roleClinic, setRoleClinic] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [interestLevel, setInterestLevel] = useState<InterestLevel>('warm')
  const [projectId, setProjectId] = useState(defaultProjectId ?? (projects[0]?.id ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    if (!projectId) { setError('Select a project'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        role_clinic: roleClinic || null,
        contact_email: email || null,
        contact_phone: phone || null,
        source: source || null,
        interest_level: interestLevel,
        project_id: projectId,
      }),
    })
    if (!res.ok) { setError('Failed to save'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Add Lead</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Name *" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input value={roleClinic} onChange={e => setRoleClinic(e.target.value)} placeholder="Role / clinic" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <input value={source} onChange={e => setSource(e.target.value)} placeholder="How they heard about it" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            {(['hot', 'warm', 'curious'] as InterestLevel[]).map(level => (
              <button key={level} type="button" onClick={() => setInterestLevel(level)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${interestLevel === level ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'}`}
              >
                {{ hot: '🔥', warm: '👍', curious: '🤷' }[level]} {level}
              </button>
            ))}
          </div>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </select>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
