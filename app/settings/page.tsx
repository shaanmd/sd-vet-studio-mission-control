import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6">⚙️ Settings</h1>

      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">Profile</h2>
        <div className="text-sm text-gray-600">
          <div className="mb-1"><span className="text-gray-400">Name:</span> {profile?.name ?? '—'}</div>
          <div className="mb-1"><span className="text-gray-400">Email:</span> {user.email}</div>
          <div><span className="text-gray-400">Role:</span> {profile?.role ?? '—'}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-1">Slack</h2>
        <p className="text-sm text-gray-400">Slack integration — coming in Phase 5.</p>
      </div>

      <div className="bg-white rounded-xl p-5 mb-4">
        <h2 className="font-semibold text-gray-700 mb-1">GitHub / Vercel</h2>
        <p className="text-sm text-gray-400">API token configuration — coming in Phase 5.</p>
      </div>

      <form action="/api/auth/signout" method="POST">
        <button type="submit" className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium text-sm">
          Sign out
        </button>
      </form>
    </div>
  )
}
