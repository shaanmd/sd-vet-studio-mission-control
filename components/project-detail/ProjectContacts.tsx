'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/lib/types/database'

interface LinkedContact {
  id: string           // project_contacts.id
  role_label: string | null
  contact: Contact
}

interface ProjectContactsProps {
  projectId: string
  initialContacts: LinkedContact[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#E8F1EE',
        color: '#1E6B5E',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {getInitials(name)}
    </div>
  )
}

type ActiveTab = 'link' | 'new'

export default function ProjectContacts({ projectId, initialContacts }: ProjectContactsProps) {
  const router = useRouter()

  // ── state ─────────────────────────────────────────────────
  const [contacts, setContacts] = useState<LinkedContact[]>(initialContacts)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)

  // tabs
  const [activeTab, setActiveTab] = useState<ActiveTab>('link')

  // link-existing tab
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState('')
  const [linkRoleLabel, setLinkRoleLabel] = useState('')
  const [linking, setLinking] = useState(false)

  // new-contact tab
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('')
  const [creating, setCreating] = useState(false)

  // ── fetch all contacts once on mount ──────────────────────
  useEffect(() => {
    setLoadingAll(true)
    fetch('/api/contacts')
      .then(r => r.json())
      .then((data: Contact[]) => setAllContacts(Array.isArray(data) ? data : []))
      .catch(() => setAllContacts([]))
      .finally(() => setLoadingAll(false))
  }, [])

  // contacts not yet linked
  const linkedIds = new Set(contacts.map(lc => lc.contact.id))
  const available = allContacts.filter(c => !linkedIds.has(c.id))

  // ── handlers ──────────────────────────────────────────────
  async function handleUnlink(projectContactId: string, contactId: string) {
    setUnlinkingId(projectContactId)
    await fetch(`/api/projects/${projectId}/contacts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId }),
    })
    setContacts(prev => prev.filter(lc => lc.id !== projectContactId))
    setUnlinkingId(null)
    router.refresh()
  }

  async function handleLink(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContactId) return
    setLinking(true)
    const res = await fetch(`/api/projects/${projectId}/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: selectedContactId,
        role_label: linkRoleLabel.trim() || null,
      }),
    })
    if (res.ok) {
      const linked: LinkedContact = await res.json()
      // optimistic — if API returns the full linked contact, use it; else fall back
      const contactObj = allContacts.find(c => c.id === selectedContactId)
      if (linked?.contact) {
        setContacts(prev => [...prev, linked])
      } else if (contactObj) {
        setContacts(prev => [
          ...prev,
          {
            id: linked?.id ?? crypto.randomUUID(),
            role_label: linkRoleLabel.trim() || null,
            contact: contactObj,
          },
        ])
      }
    }
    setSelectedContactId('')
    setLinkRoleLabel('')
    setLinking(false)
    router.refresh()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)

    // 1. create contact
    const createRes = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        company: newCompany.trim() || null,
        email: newEmail.trim() || null,
        role: null,
      }),
    })

    if (createRes.ok) {
      const newContact: Contact = await createRes.json()

      // 2. link to project
      const linkRes = await fetch(`/api/projects/${projectId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: newContact.id,
          role_label: newRole.trim() || null,
        }),
      })

      if (linkRes.ok) {
        const linked: LinkedContact = await linkRes.json()
        setContacts(prev => [
          ...prev,
          linked?.contact
            ? linked
            : {
                id: linked?.id ?? crypto.randomUUID(),
                role_label: newRole.trim() || null,
                contact: newContact,
              },
        ])
        setAllContacts(prev => [...prev, newContact])
      }
    }

    setNewName('')
    setNewCompany('')
    setNewEmail('')
    setNewRole('')
    setCreating(false)
    router.refresh()
  }

  // ── render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Contact list */}
      {contacts.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9AA5AC', marginBottom: 12 }}>
          No contacts linked yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
          {contacts.map((lc, i) => (
            <div
              key={lc.id}
              className="group"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < contacts.length - 1 ? '1px solid #F5F0E8' : 'none',
              }}
            >
              <Avatar name={lc.contact.name} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0D2035' }}>
                    {lc.contact.name}
                  </span>
                  {lc.role_label && (
                    <span
                      style={{
                        fontSize: 11,
                        color: '#6B7A82',
                        background: '#F5F0E8',
                        borderRadius: 4,
                        padding: '1px 6px',
                        fontWeight: 500,
                      }}
                    >
                      {lc.role_label}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#9AA5AC', margin: '1px 0 0', lineHeight: 1.4 }}>
                  {[lc.contact.role, lc.contact.company].filter(Boolean).join(' · ') || ' '}
                </p>
                {lc.contact.email && (
                  <a
                    href={`mailto:${lc.contact.email}`}
                    style={{ fontSize: 11, color: '#1E6B5E', textDecoration: 'none' }}
                  >
                    {lc.contact.email}
                  </a>
                )}
              </div>

              {/* Unlink button — hover-reveal */}
              <button
                onClick={() => handleUnlink(lc.id, lc.contact.id)}
                disabled={unlinkingId === lc.id}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  fontSize: 11,
                  color: '#9AA5AC',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  flexShrink: 0,
                }}
                title="Unlink contact"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add contact section */}
      <div
        style={{
          borderTop: '1px solid #E8E2D6',
          paddingTop: 12,
        }}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {(
            [
              { key: 'link', label: '+ Link existing' },
              { key: 'new',  label: '+ New contact'  },
            ] as { key: ActiveTab; label: string }[]
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid',
                cursor: 'pointer',
                background: activeTab === tab.key ? '#E8F1EE' : 'transparent',
                borderColor: activeTab === tab.key ? '#1E6B5E' : '#E8E2D6',
                color: activeTab === tab.key ? '#1E6B5E' : '#6B7A82',
                transition: 'all 0.1s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Link existing */}
        {activeTab === 'link' && (
          <form onSubmit={handleLink} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <select
              value={selectedContactId}
              onChange={e => setSelectedContactId(e.target.value)}
              disabled={loadingAll}
              style={{
                width: '100%',
                border: '1px solid #E8E2D6',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: selectedContactId ? '#0D2035' : '#9AA5AC',
                background: '#fff',
                outline: 'none',
              }}
            >
              <option value="">
                {loadingAll ? 'Loading contacts…' : available.length === 0 ? 'All contacts already linked' : 'Select a contact…'}
              </option>
              {available.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
            <input
              value={linkRoleLabel}
              onChange={e => setLinkRoleLabel(e.target.value)}
              placeholder="Role, e.g. Client (optional)"
              style={{
                width: '100%',
                border: '1px solid #E8E2D6',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: '#0D2035',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={linking || !selectedContactId}
              style={{
                background: '#1E6B5E',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 0',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: linking || !selectedContactId ? 0.5 : 1,
                transition: 'opacity 0.1s',
              }}
            >
              {linking ? 'Linking…' : 'Link contact'}
            </button>
          </form>
        )}

        {/* New contact */}
        {activeTab === 'new' && (
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name *"
              required
              style={{
                width: '100%',
                border: '1px solid #E8E2D6',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: '#0D2035',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              value={newCompany}
              onChange={e => setNewCompany(e.target.value)}
              placeholder="Company (optional)"
              style={{
                width: '100%',
                border: '1px solid #E8E2D6',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: '#0D2035',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email (optional)"
              type="email"
              style={{
                width: '100%',
                border: '1px solid #E8E2D6',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: '#0D2035',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <input
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              placeholder="Role in project, e.g. Client (optional)"
              style={{
                width: '100%',
                border: '1px solid #E8E2D6',
                borderRadius: 8,
                padding: '7px 10px',
                fontSize: 13,
                color: '#0D2035',
                background: '#fff',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              style={{
                background: '#1E6B5E',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 0',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: creating || !newName.trim() ? 0.5 : 1,
                transition: 'opacity 0.1s',
              }}
            >
              {creating ? 'Creating…' : 'Create & link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
