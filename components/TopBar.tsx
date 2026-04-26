// components/TopBar.tsx
import type { ReactNode } from 'react'

interface TopBarProps {
  crumbs: string[]
  right?: ReactNode
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
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span style={{ color: '#9AA5AC' }}>/</span>
            )}
            <span
              style={{
                color: i === crumbs.length - 1 ? '#0D2035' : '#6B7A82',
                fontWeight: i === crumbs.length - 1 ? 700 : 500,
              }}
            >
              {c}
            </span>
          </span>
        ))}
      </div>
      {right && (
        <div className="flex items-center gap-2.5">{right}</div>
      )}
    </div>
  )
}
