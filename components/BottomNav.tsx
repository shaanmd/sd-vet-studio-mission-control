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

export default function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex md:hidden items-center justify-around bg-white border-t border-black/[0.08] z-50 py-2">
      {navItems.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 text-xs ${
              active ? 'text-[#1E6B5E] font-semibold' : 'text-[#8899a6]'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
