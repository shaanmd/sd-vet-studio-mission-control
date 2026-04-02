'use client'

import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/hooks/use-auth'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-[#F5F0E8]">
        <Sidebar />
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  )
}
