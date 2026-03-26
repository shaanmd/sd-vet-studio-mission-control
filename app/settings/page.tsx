'use client'

import { useAuth } from '@/lib/hooks/use-auth'

export default function SettingsPage() {
  const { profile, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F0E8' }}>
        <p className="text-[#2C3E50]">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#F5F0E8' }}>
      <h1 className="text-2xl font-bold text-[#2C3E50] mb-4">Settings</h1>
      <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        {profile && (
          <div className="space-y-1">
            <p className="text-[#2C3E50] font-semibold">{profile.name}</p>
            <p className="text-sm text-[#8899a6]">{profile.role}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
