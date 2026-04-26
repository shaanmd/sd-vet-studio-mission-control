'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LogExpenseForm from './LogExpenseForm'
import LogRevenueForm from './LogRevenueForm'

interface Props {
  projects: Array<{ id: string; name: string; emoji: string }>
}

export default function FinanceTopBarActions({ projects }: Props) {
  const [showExpense, setShowExpense] = useState(false)
  const [showRevenue, setShowRevenue] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <>
      <button
        onClick={() => setShowExpense(true)}
        className="px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors"
        style={{ border: '1px solid #D9D2C2', background: '#fff', color: '#2A3A48' }}
      >
        + Log expense
      </button>
      <button
        onClick={() => setShowRevenue(true)}
        className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: '#1E6B5E' }}
      >
        + Log revenue
      </button>
      {mounted && showExpense && createPortal(
        <LogExpenseForm projects={projects} onClose={() => setShowExpense(false)} />,
        document.body
      )}
      {mounted && showRevenue && createPortal(
        <LogRevenueForm projects={projects} onClose={() => setShowRevenue(false)} />,
        document.body
      )}
    </>
  )
}
