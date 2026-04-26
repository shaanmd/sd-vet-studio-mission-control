import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopBar from '@/components/TopBar'

const INTEGRATIONS = [
  { name: 'GitHub', icon: '🐙', desc: 'Repo sync & commit tracking', status: 'coming' },
  { name: 'Vercel', icon: '▲', desc: 'Deploy status & logs', status: 'coming' },
  { name: 'Slack', icon: '💬', desc: 'Daily digest & alerts', status: 'coming' },
  { name: 'Stripe', icon: '💳', desc: 'Revenue tracking', status: 'coming' },
  { name: 'Google Calendar', icon: '📅', desc: 'Task due dates & events', status: 'coming' },
]

const TEAM = [
  { name: 'Shaan', role: 'Co-founder · Dev', emoji: '👩‍💻', color: '#E8F1EE', textColor: '#1E6B5E' },
  { name: 'Deb', role: 'Co-founder · Vet', emoji: '👩‍⚕️', color: '#EEE8F6', textColor: '#7B5EA8' },
]

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
    <>
      <TopBar crumbs={['Settings']} />
      <div style={{ padding: '22px 28px', paddingBottom: 40, maxWidth: 680 }}>
        <div className="mb-6">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E6B5E', letterSpacing: -0.5 }}
          >
            ⚙️ Settings
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#9AA5AC' }}>Manage your profile, team, and integrations</p>
        </div>

        {/* Profile */}
        <section className="mb-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[2px] mb-3" style={{ color: '#9AA5AC' }}>Profile</h2>
          <div className="rounded-xl p-5" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[20px] font-bold shrink-0"
                style={{ background: '#E8F1EE', color: '#1E6B5E' }}
              >
                {profile?.name?.charAt(0) ?? user.email?.charAt(0) ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold truncate" style={{ color: '#1E2A35' }}>
                  {profile?.name ?? '—'}
                </div>
                <div className="text-[12.5px]" style={{ color: '#9AA5AC' }}>{user.email}</div>
                {profile?.role && (
                  <div className="text-[11.5px] mt-0.5" style={{ color: '#6B7A82' }}>{profile.role}</div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-5">
          <h2 className="text-[11px] font-bold uppercase tracking-[2px] mb-3" style={{ color: '#9AA5AC' }}>Team</h2>
          <div className="flex flex-col gap-2">
            {TEAM.map(member => (
              <div
                key={member.name}
                className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{ background: '#fff', border: '1px solid #E8E2D6' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[18px] shrink-0"
                  style={{ background: member.color }}
                >
                  {member.emoji}
                </div>
                <div>
                  <div className="text-[13.5px] font-bold" style={{ color: '#1E2A35' }}>{member.name}</div>
                  <div className="text-[11.5px]" style={{ color: '#9AA5AC' }}>{member.role}</div>
                </div>
                <div className="ml-auto">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: member.color, color: member.textColor }}
                  >
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations */}
        <section className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[2px] mb-3" style={{ color: '#9AA5AC' }}>Integrations</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E8E2D6' }}>
            {INTEGRATIONS.map((intg, i) => (
              <div
                key={intg.name}
                className="flex items-center gap-4 px-5 py-3.5"
                style={{
                  background: '#fff',
                  borderBottom: i < INTEGRATIONS.length - 1 ? '1px solid #EFEAE0' : 'none',
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[16px] shrink-0"
                  style={{ background: '#F5F0E8' }}
                >
                  {intg.icon}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold" style={{ color: '#1E2A35' }}>{intg.name}</div>
                  <div className="text-[11.5px]" style={{ color: '#9AA5AC' }}>{intg.desc}</div>
                </div>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#F5F0E8', color: '#9AA5AC' }}
                >
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full py-3 rounded-xl text-[13px] font-semibold transition-colors"
            style={{ border: '1px solid #EACACA', color: '#C0392B', background: '#fff' }}
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  )
}
