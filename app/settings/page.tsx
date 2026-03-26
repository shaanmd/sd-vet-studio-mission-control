'use client'

import { useAuth } from '@/lib/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [name, setName] = useState(profile?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSaveName() {
    if (!profile || !name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ name: name.trim() }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <h1 className="text-xl font-bold text-[#2C3E50] mb-4">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-black/[0.08] p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-3">Profile</div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#8899a6] block mb-1">Name</label>
            <div className="flex gap-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-black/10 bg-[#F5F0E8] text-sm" />
              <button onClick={handleSaveName} disabled={saving} className="px-3 py-2 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold disabled:opacity-50">
                {saved ? '\u2713 Saved' : saving ? '...' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-[#8899a6] block mb-1">Role</label>
            <p className="text-sm text-[#2C3E50]">{profile?.role ?? '\u2014'}</p>
          </div>
        </div>
      </div>

      {/* Integrations Placeholder */}
      <div className="bg-white rounded-xl border border-black/[0.08] p-4 mb-4">
        <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-3">Integrations</div>
        <div className="space-y-3 text-sm text-[#8899a6]">
          <div className="flex justify-between items-center">
            <span>GitHub API Token</span>
            <span className="text-xs bg-[#F5F0E8] px-2 py-1 rounded">Phase 4</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Vercel API Token</span>
            <span className="text-xs bg-[#F5F0E8] px-2 py-1 rounded">Phase 4</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Slack Workspace</span>
            <span className="text-xs bg-[#F5F0E8] px-2 py-1 rounded">Phase 4</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button onClick={handleSignOut} className="w-full py-2.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 transition-colors">
        Sign out
      </button>
    </div>
  )
}
