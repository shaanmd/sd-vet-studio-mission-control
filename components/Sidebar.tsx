// components/Sidebar.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/projects', icon: '📂', label: 'Projects' },
  { href: '/finance', icon: '💰', label: 'Finance' },
  { href: '/marketing', icon: '📣', label: 'Marketing' },
  { href: '/leads', icon: '🎯', label: 'Leads' },
  { href: '/log', icon: '🏆', label: 'Log & Wins' },
  { href: '/resources', icon: '🔗', label: 'Resources' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-gray-200 py-6 px-3 shrink-0">
      <div className="px-3 mb-8">
        <div className="text-teal-700 font-bold text-sm">SD VetStudio</div>
        <div className="text-gray-400 text-xs">Mission Control</div>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(item => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-teal-700'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
