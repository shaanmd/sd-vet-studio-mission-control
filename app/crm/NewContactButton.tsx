'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface NewContactButtonProps {
  label?: string
}

export default function NewContactButton({ label = '+ New contact' }: NewContactButtonProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value.trim(),
      company: (form.elements.namedItem('company') as HTMLInputElement).value.trim() || null,
      role: (form.elements.namedItem('role') as HTMLInputElement).value.trim() || null,
      email: (form.elements.namedItem('email') as HTMLInputElement).value.trim() || null,
      phone: (form.elements.namedItem('phone') as HTMLInputElement).value.trim() || null,
    }
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to save contact')
      }
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const modal = open && mounted
    ? createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(13,32,53,0.45)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            className="rounded-2xl w-full mx-4"
            style={{
              maxWidth: 480,
              background: '#FBF7EF',
              border: '1px solid #E8E2D6',
              padding: '28px 28px 24px',
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold" style={{ fontSize: 18, color: '#0D2035' }}>
                New contact
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ fontSize: 18, color: '#9AA5AC', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Name */}
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
                  Name <span style={{ color: '#C0392B' }}>*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="Jane Smith"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{
                    border: '1px solid #E8E2D6',
                    background: '#FFFFFF',
                    color: '#0D2035',
                    // @ts-ignore
                    '--tw-ring-color': '#1E6B5E',
                  }}
                />
              </div>

              {/* Company */}
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
                  Company
                </label>
                <input
                  name="company"
                  placeholder="Acme Vet Clinic"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
                  Role
                </label>
                <input
                  name="role"
                  placeholder="Practice Manager"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="jane@acme.vet"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block mb-1" style={{ fontSize: 12, fontWeight: 600, color: '#2A3A48' }}>
                  Phone
                </label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+61 4xx xxx xxx"
                  className="w-full rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ border: '1px solid #E8E2D6', background: '#FFFFFF', color: '#0D2035' }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 13, color: '#C0392B', background: '#FDECEA', borderRadius: 8, padding: '8px 12px' }}>
                  {error}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium"
                  style={{ color: '#6B7A82', background: '#FFFFFF', border: '1px solid #E8E2D6' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: saving ? '#9AA5AC' : '#1E6B5E' }}
                >
                  {saving ? 'Saving…' : 'Save contact'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )
    : null

  return (
    <>
      <button
        type="button"
        data-new-contact
        onClick={() => setOpen(true)}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
        style={{ background: '#1E6B5E' }}
      >
        {label}
      </button>
      {modal}
    </>
  )
}
