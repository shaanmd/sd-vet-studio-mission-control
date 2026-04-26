'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { InterestLevel } from '@/lib/types/database'

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
  defaultProjectId?: string
  onClose: () => void
}

export default function AddLeadForm({ projects: initialProjects, defaultProjectId, onClose }: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)

  // Lead fields
  const [name, setName] = useState('')
  const [roleClinic, setRoleClinic] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('')
  const [interestLevel, setInterestLevel] = useState<InterestLevel>('warm')
  const [projectId, setProjectId] = useState(defaultProjectId ?? '')
  const [notes, setNotes] = useState('')
  const [links, setLinks] = useState<Array<{ label: string; url: string }>>([])

  // New project inline creation
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectEmoji, setNewProjectEmoji] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addLink() {
    setLinks(prev => [...prev, { label: '', url: '' }])
  }

  function updateLink(i: number, field: 'label' | 'url', val: string) {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))
  }

  function removeLink(i: number) {
    setLinks(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return
    setCreatingProject(true)
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProjectName.trim(), emoji: newProjectEmoji || '📁', stage: 'inbox' }),
    })
    if (res.ok) {
      const created = await res.json()
      const newP = { id: created.id, name: newProjectName.trim(), emoji: newProjectEmoji || '📁' }
      setProjects(prev => [...prev, newP])
      setProjectId(created.id)
      setNewProjectName('')
      setNewProjectEmoji('')
      setShowNewProject(false)
    }
    setCreatingProject(false)
  }

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
        notes: notes.trim() || null,
        links: links.filter(l => l.url.trim()).length > 0 ? links.filter(l => l.url.trim()) : null,
      }),
    })

    if (!res.ok) { setError('Failed to save'); setSaving(false); return }
    router.refresh()
    onClose()
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Add Lead</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">

          {/* Basic info */}
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Name *" className={inputCls} />
          <input value={roleClinic} onChange={e => setRoleClinic(e.target.value)} placeholder="Role / clinic" className={inputCls} />
          <div className="flex gap-2">
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" className={`flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none`} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" className={`flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none`} />
          </div>
          <input value={source} onChange={e => setSource(e.target.value)} placeholder="How they heard about it" className={inputCls} />

          {/* Interest level */}
          <div className="flex gap-2">
            {(['hot', 'warm', 'curious'] as InterestLevel[]).map(level => (
              <button key={level} type="button" onClick={() => setInterestLevel(level)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  interestLevel === level ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500'
                }`}
              >
                {{ hot: '🔥', warm: '👍', curious: '🤷' }[level]} {level}
              </button>
            ))}
          </div>

          {/* Project select + New Project */}
          <div>
            <select
              value={projectId}
              onChange={e => { if (e.target.value === '__new__') setShowNewProject(true); else setProjectId(e.target.value) }}
              className={inputCls}
            >
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
              <option value="__new__">＋ New project…</option>
            </select>

            {showNewProject && (
              <div className="mt-2 p-3 rounded-xl border border-teal-200 bg-teal-50 flex flex-col gap-2">
                <div className="text-xs font-semibold text-teal-700 mb-1">New project</div>
                <div className="flex gap-2">
                  <input
                    value={newProjectEmoji}
                    onChange={e => setNewProjectEmoji(e.target.value)}
                    placeholder="📁"
                    className="w-12 text-center border border-gray-200 rounded-lg px-1 py-1.5 text-sm"
                    maxLength={2}
                  />
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    placeholder="Project name"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleCreateProject())}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-500">Cancel</button>
                  <button type="button" onClick={handleCreateProject} disabled={creatingProject || !newProjectName.trim()} className="flex-1 py-1.5 text-sm bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50">
                    {creatingProject ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any context about this lead…"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>

          {/* Links */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Links</label>
              <button type="button" onClick={addLink} className="text-xs font-medium text-teal-600">+ Add link</button>
            </div>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={link.label}
                  onChange={e => updateLink(i, 'label', e.target.value)}
                  placeholder="Label (e.g. LinkedIn)"
                  className="w-32 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
                <input
                  value={link.url}
                  onChange={e => updateLink(i, 'url', e.target.value)}
                  placeholder="https://…"
                  type="url"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => removeLink(i)} className="text-gray-300 hover:text-red-400 text-sm px-1">✕</button>
              </div>
            ))}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-medium disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
