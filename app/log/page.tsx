'use client'
import { useState, useEffect } from 'react'
import ActivityFeed from '@/components/log/ActivityFeed'
import WinWall from '@/components/log/WinWall'

export default function LogPage() {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')
  const [activities, setActivities] = useState<any[]>([])
  const [wins, setWins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/log/activity').then(r => r.json()),
      fetch('/api/log/wins').then(r => r.json()),
    ]).then(([a, w]) => {
      setActivities(Array.isArray(a) ? a : [])
      setWins(Array.isArray(w) ? w : [])
      setLoading(false)
    })
  }, [])

  async function handleGenerateSummary() {
    setSummaryLoading(true)
    try {
      const res = await fetch('/api/ai/win-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wins }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAiSummary(data.summary ?? null)
    } catch {
      setAiSummary('Could not generate summary. Try again in a moment.')
    } finally {
      setSummaryLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏆 Log & Wins</h1>

      <div className="flex bg-teal-50 rounded-xl p-1 mb-5 gap-1">
        <button
          onClick={() => setTab('activity')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'activity' ? 'bg-teal-700 text-white' : 'text-teal-700'
          }`}
        >
          Activity
        </button>
        <button
          onClick={() => setTab('wins')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'wins' ? 'bg-teal-700 text-white' : 'text-teal-700'
          }`}
        >
          🏆 Win Wall
        </button>
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}

      {!loading && tab === 'wins' && wins.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
          {aiSummary ? (
            <>
              <p className="text-sm text-amber-900 leading-relaxed">{aiSummary}</p>
              <button
                onClick={() => setAiSummary(null)}
                className="text-xs text-amber-600 mt-2 font-medium"
              >
                Clear
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateSummary}
              disabled={summaryLoading}
              className="w-full text-sm font-medium text-amber-800 disabled:opacity-50"
            >
              {summaryLoading ? 'Generating celebration…' : '✨ Generate AI win summary'}
            </button>
          )}
        </div>
      )}

      {!loading && tab === 'activity' && <ActivityFeed activities={activities} />}
      {!loading && tab === 'wins' && <WinWall wins={wins} />}
    </div>
  )
}
