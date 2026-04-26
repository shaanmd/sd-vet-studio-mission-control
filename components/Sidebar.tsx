'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'

const NAV_ITEMS = [
  { href: '/',           label: 'Home',      shortcut: '⌘1' },
  { href: '/projects',  label: 'Projects',   shortcut: '⌘2' },
  { href: '/finance',   label: 'Finance',    shortcut: '⌘3' },
  { href: '/crm',       label: 'CRM',        shortcut: '⌘4' },
  { href: '/leads',     label: 'Leads',      shortcut: '⌘5' },
  { href: '/log',       label: 'Log & Wins', shortcut: '⌘6' },
  { href: '/meetings',  label: 'Meetings',   shortcut: '⌘7' },
  { href: '/marketing', label: 'Marketing',  shortcut: '⌘8' },
  { href: '/resources', label: 'Resources',  shortcut: '⌘9' },
  { href: '/settings',  label: 'Settings',   shortcut: '⌘0' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const name = profile?.name ?? ''
  const initial = name.charAt(0).toUpperCase()
  const isShaan = name === 'Shaan'
  const avatarBg = isShaan ? '#E8F1EE' : '#EEE8F6'
  const avatarColor = isShaan ? '#1E6B5E' : '#7B5EA8'

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0"
      style={{ background: '#FBF7EF', borderRight: '1px solid #E8E2D6', minHeight: '100vh' }}
    >
      {/* Brand mark */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[15px] font-bold shrink-0"
          style={{ background: '#1E6B5E', fontFamily: 'Georgia, serif' }}
        >
          SD
        </div>
        <div>
          <div className="text-[13px] font-bold leading-tight" style={{ color: '#0D2035' }}>
            VetStudio
          </div>
          <div className="text-[10px] font-semibold tracking-[0.5px]" style={{ color: '#6B7A82' }}>
            MISSION CONTROL
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-0.5 px-3.5 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-2.5 py-[8px] rounded-lg text-[13.5px] transition-colors"
              style={{
                background: isActive ? '#E8F1EE' : 'transparent',
                color: isActive ? '#1E6B5E' : '#2A3A48',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <span>{item.label}</span>
              <span className="font-mono text-[10px]" style={{ color: '#9AA5AC' }}>
                {item.shortcut}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* User card */}
      {profile && (
        <div
          className="mx-3.5 mb-4 mt-2 flex items-center gap-2.5 p-2.5 rounded-xl"
          style={{ background: '#FFFFFF', border: '1px solid #E8E2D6' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: avatarBg, color: avatarColor }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold truncate" style={{ color: '#0D2035' }}>
              {name}
            </div>
            <div className="text-[10.5px]" style={{ color: '#6B7A82' }}>
              Signed in
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
