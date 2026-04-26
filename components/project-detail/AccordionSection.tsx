'use client'
import { useState } from 'react'

interface AccordionSectionProps {
  icon: string
  title: string
  defaultOpen?: boolean
  rightSlot?: React.ReactNode
  accentBorder?: boolean
  children: React.ReactNode
}

export default function AccordionSection({
  icon,
  title,
  defaultOpen = false,
  rightSlot,
  accentBorder = false,
  children,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: '1px solid #E8E2D6',
        borderLeft: accentBorder ? '3px solid #1E6B5E' : '1px solid #E8E2D6',
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-4 py-3.5 text-left"
        style={{ background: open ? '#FFFFFF' : '#FDFAF5' }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#0D2035',
            flex: 1,
          }}
        >
          {title}
        </span>

        {rightSlot && <div className="flex items-center">{rightSlot}</div>}

        <span
          style={{
            fontSize: 11,
            color: '#9AA5AC',
            display: 'inline-block',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
            lineHeight: 1,
          }}
        >
          ▶
        </span>
      </button>

      {/* Content */}
      {open && <div style={{ background: '#FFFFFF' }}>{children}</div>}
    </div>
  )
}
