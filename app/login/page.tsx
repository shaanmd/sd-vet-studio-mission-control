'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PASSCODE_MAP: Record<string, string> = {
  SHAANMC: process.env.NEXT_PUBLIC_SHAAN_EMAIL ?? '',
  DEBMC: process.env.NEXT_PUBLIC_DEB_EMAIL ?? '',
}

export default function LoginPage() {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const code = passcode.trim().toUpperCase()
    const email = PASSCODE_MAP[code]

    if (!email) {
      setError('Invalid passcode')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: code,
    })

    if (error) {
      setError('Login failed. Please try again.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F5F0E8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
        padding: '2.5rem 2rem',
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🐾</div>
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#2C3E50',
            margin: '0 0 0.25rem 0',
          }}>
            Mission Control
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#8899a6',
            margin: 0,
          }}>
            SD VetStudio
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="passcode"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#2C3E50',
                marginBottom: '0.375rem',
              }}
            >
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
              autoComplete="off"
              placeholder="Enter your passcode"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                fontSize: '1rem',
                border: '1.5px solid #d1d5db',
                borderRadius: '8px',
                outline: 'none',
                color: '#2C3E50',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
                letterSpacing: '0.15em',
                textAlign: 'center',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#1E6B5E')}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.625rem 0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '0.875rem',
              color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1rem',
              fontWeight: '600',
              color: '#ffffff',
              backgroundColor: loading ? '#5a9e94' : '#1E6B5E',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget.style.backgroundColor = '#165a4e')
            }}
            onMouseLeave={(e) => {
              if (!loading) (e.currentTarget.style.backgroundColor = '#1E6B5E')
            }}
          >
            {loading ? 'Signing in…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
