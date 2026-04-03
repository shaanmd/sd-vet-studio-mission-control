import type { Resource } from '@/lib/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  dev: '🛠 Dev & Deployment',
  marketing: '📣 Marketing & Content',
  ai: '🤖 AI Tools',
  business: '💼 Business',
  brand: '🎨 Brand',
  contacts: '👥 Contacts',
}

interface Props {
  resources: Resource[]
}

export default function ResourceList({ resources }: Props) {
  const grouped = resources.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = []
    acc[r.category].push(r)
    return acc
  }, {} as Record<string, Resource[]>)

  return (
    <div className="flex flex-col gap-6">
      {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
        const items = grouped[cat]
        if (!items?.length) return null
        return (
          <div key={cat}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{label}</h2>
            <div className="flex flex-col gap-2">
              {items.map(r => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="text-xl">{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm">{r.name}</div>
                    {r.description && <div className="text-xs text-gray-400 truncate">{r.description}</div>}
                  </div>
                  <span className="text-gray-300 text-sm">↗</span>
                </a>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
