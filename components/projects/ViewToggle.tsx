'use client'

interface ViewToggleProps {
  view: 'list' | 'board'
  onToggle: (view: 'list' | 'board') => void
}

export default function ViewToggle({ view, onToggle }: ViewToggleProps) {
  return (
    <div className="flex bg-[#F5F0E8] rounded-lg p-0.5">
      <button
        onClick={() => onToggle('list')}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          view === 'list'
            ? 'bg-white text-[#2C3E50] shadow-sm'
            : 'text-[#8899a6]'
        }`}
      >
        List
      </button>
      <button
        onClick={() => onToggle('board')}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          view === 'board'
            ? 'bg-white text-[#2C3E50] shadow-sm'
            : 'text-[#8899a6]'
        }`}
      >
        Board
      </button>
    </div>
  )
}
