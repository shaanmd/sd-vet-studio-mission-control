// components/marketing/ToolLinksGrid.tsx
const TOOLS = [
  { name: 'Canva', icon: '🎨', url: 'https://www.canva.com' },
  { name: 'Blotato', icon: '📱', url: 'https://blotato.com' },
  { name: 'Meta Suite', icon: '👥', url: 'https://business.facebook.com' },
  { name: 'Content360', icon: '📅', url: 'https://content360.com' },
  { name: 'CapCut', icon: '🎬', url: 'https://www.capcut.com' },
  { name: 'YouTube Studio', icon: '▶️', url: 'https://studio.youtube.com' },
]

export default function ToolLinksGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {TOOLS.map(tool => (
        <a
          key={tool.name}
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-xl p-3 text-center hover:shadow-md transition-shadow"
        >
          <div className="text-2xl mb-1">{tool.icon}</div>
          <div className="text-xs font-medium text-gray-700">{tool.name}</div>
        </a>
      ))}
    </div>
  )
}
