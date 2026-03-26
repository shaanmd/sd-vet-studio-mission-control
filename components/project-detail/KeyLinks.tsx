import type { ProjectLink } from '@/lib/types/database'

export default function KeyLinks({ links }: { links: ProjectLink[] }) {
  if (!links || links.length === 0) return null

  return (
    <div className="mb-4">
      <h2 className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold mb-2">
        Key Links
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white rounded-xl border border-black/[0.08] p-3 hover:border-[#1E6B5E]/20 transition-colors"
          >
            {link.icon && <span className="text-base">{link.icon}</span>}
            <span className="text-sm text-[#2C3E50] font-medium truncate">
              {link.label}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
