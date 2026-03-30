'use client'

import { useEffect } from 'react'

interface UndoToastProps {
  message: string
  onUndo: () => void
  onDismiss: () => void
}

export default function UndoToast({ message, onUndo, onDismiss }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#2C3E50] text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-sm">
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="font-semibold text-[#D4A853] hover:text-[#e8c06a] transition-colors"
      >
        Undo
      </button>
    </div>
  )
}
