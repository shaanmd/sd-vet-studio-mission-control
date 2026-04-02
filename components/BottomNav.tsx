// components/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', icon: '🏠', label: 'Home' },
  { href: '/projects', icon: '📂', label: 'Projects' },
  { href: '/finance', icon: '💰', label: 'Finance' },
  { href: '/leads', icon: '🎯', label: 'Leads' },
  { href: '/log', icon: '🏆', label: 'Log' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex md:hidden">
      {NAV_ITEMS.map(item => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
              isActive
                ? 'text-teal-700 font-semibold'
                : 'text-gray-500 hover:text-teal-700'
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
