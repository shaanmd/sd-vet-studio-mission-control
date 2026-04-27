// components/TopBar.tsx
import type { ReactNode } from 'react'
import Link from 'next/link'

export type Crumb = string | { label: string; href?: string }

interface TopBarProps {
  crumbs: Crumb[]
  right?: ReactNode
}

// Known top-level section crumbs auto-link to their list pages so existing
// callers using plain strings get clickable breadcrumbs for free.
const AUTO_LINKS: Record<string, string> = {
  'Home':       '/',
  'Projects':   '/projects',
  'CRM':        '/crm',
  'Contacts':   '/crm',
  'Leads':      '/crm?stage=lead',
  'Finance':    '/finance',
  'Log & Wins': '/log',
  'Meetings':   '/meetings',
  'Marketing':  '/marketing',
  'Resources':  '/resources',
  'Settings':   '/settings',
}

function resolveCrumb(c: Crumb): { label: string; href?: string } {
  if (typeof c === 'string') return { label: c, href: AUTO_LINKS[c] }
  return c
}

export default function TopBar({ crumbs, right }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-7 py-3.5 sticky top-0 z-10"
      style={{
        borderBottom: '1px solid #E8E2D6',
        background: 'rgba(245,240,232,0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-center gap-2 text-[13px]">
        {crumbs.map((raw, i) => {
          const { label, href } = resolveCrumb(raw)
          const isLast = i === crumbs.length - 1
          // Last crumb is always plain text (current page), earlier crumbs link if we have an href
          const linkable = !isLast && Boolean(href)

          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span style={{ color: '#9AA5AC' }}>/</span>}
              {linkable ? (
                <Link
                  href={href!}
                  style={{
                    color: '#6B7A82',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 0.1s',
                  }}
                  className="hover:!text-[#1E6B5E]"
                >
                  {label}
                </Link>
              ) : (
                <span
                  style={{
                    color: isLast ? '#0D2035' : '#6B7A82',
                    fontWeight: isLast ? 700 : 500,
                  }}
                >
                  {label}
                </span>
              )}
            </span>
          )
        })}
      </div>
      {right && (
        <div className="flex items-center gap-2.5">{right}</div>
      )}
    </div>
  )
}
