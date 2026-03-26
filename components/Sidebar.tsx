'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Projects', href: '/projects', icon: '📂' },
  { label: 'Log', href: '/log', icon: '✏️' },
  { label: 'Resources', href: '/resources', icon: '🔗' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen sticky top-0 bg-white border-r border-black/[0.08]">
      <div className="px-5 py-5">
        <p className="text-xs uppercase tracking-wider text-[#2C3E50]">SD VetStudio</p>
        <p className="text-lg font-bold text-[#2C3E50]">Mission Control</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#1E6B5E]/10 text-[#1E6B5E] font-semibold'
                  : 'text-[#2C3E50] hover:bg-black/5'
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
