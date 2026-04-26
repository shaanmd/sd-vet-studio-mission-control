'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/lib/types/database'

interface WhatIKnowProps {
  contactId: string
  contact: Contact
}

const FIELDS: {
  key: keyof Pick<Contact, 'comms_style' | 'decision_style' | 'personal_context' | 'future_opportunities'>
  label: string
  placeholder: string
}[] = [
  {
    key: 'comms_style',
    label: 'How they communicate',
    placeholder: 'e.g. Prefers short emails, replies quickly, likes voice notes…',
  },
  {
    key: 'decision_style',
    label: 'How they decide',
    placeholder: 'e.g. Needs time to consult their team, driven by ROI data…',
  },
  {
    key: 'personal_context',
    label: 'Personal context',
    placeholder: 'e.g. Has two kids, loves footy, originally from Perth…',
  },
  {
    key: 'future_opportunities',
    label: 'Future opportunities',
    placeholder: 'e.g. Mentioned interest in a training course for their staff…',
  },
]

export default function WhatIKnow({ contactId, contact }: WhatIKnowProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>(() => ({
    comms_style:           contact.comms_style ?? '',
    decision_style:        contact.decision_style ?? '',
    personal_context:      contact.personal_context ?? '',
    future_opportunities:  contact.future_opportunities ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(key: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: values[key] || null }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save')
      }
      setEditing(null)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="flex flex-col divide-y"
      style={{ borderTop: '1px solid #E8E2D6', borderColor: '#E8E2D6' }}
    >
      {FIELDS.map(({ key, label, placeholder }) => {
        const isEditing = editing === key
        const value = values[key]

        return (
          <div key={key} className="px-4 py-4" style={{ background: '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>{label}</span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setEditing(key)}
                  className="text-xs rounded-lg px-2.5 py-1"
                  style={{ color: '#1E6B5E', background: '#E8F1EE' }}
                >
                  {value ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-2">
                <textarea
                  rows={3}
                  value={value}
                  placeholder={placeholder}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
                  style={{ border: '1px solid #E8E2D6', background: '#FBF7EF', color: '#0D2035' }}
                />
                {error && (
                  <p style={{ fontSize: 12, color: '#C0392B', background: '#FDECEA', borderRadius: 8, padding: '6px 10px' }}>
                    {error}
                  </p>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null)
                      setError(null)
                      // reset to server value
                      setValues((prev) => ({
                        ...prev,
                        [key]: (contact[key as keyof Contact] as string | null) ?? '',
                      }))
                    }}
                    className="rounded-xl px-3 py-1.5 text-xs font-medium"
                    style={{ color: '#6B7A82', background: '#FFFFFF', border: '1px solid #E8E2D6' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(key)}
                    disabled={saving}
                    className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: saving ? '#9AA5AC' : '#1E6B5E' }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: value ? '#2A3A48' : '#9AA5AC',
                  lineHeight: 1.5,
                  fontStyle: value ? 'normal' : 'italic',
                }}
              >
                {value || placeholder}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
