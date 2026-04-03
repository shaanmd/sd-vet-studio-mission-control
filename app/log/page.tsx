'use client'
import { useState, useEffect } from 'react'
import ActivityFeed from '@/components/log/ActivityFeed'
import WinWall from '@/components/log/WinWall'

export default function LogPage() {
  const [tab, setTab] = useState<'activity' | 'wins'>('activity')
  const [activities, setActivities] = useState<any[]>([])
  const [wins, setWins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏆 Log & Wins</h1>
      <div className="flex bg-teal-50 rounded-xl p-1 mb-5 gap-1">
        <button onClick={() => setTab('activity')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'activity' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}>Activity</button>
        <button onClick={() => setTab('wins')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'wins' ? 'bg-teal-700 text-white' : 'text-teal-700'}`}>🏆 Win Wall</button>
      </div>
      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
      {!loading && tab === 'activity' && <ActivityFeed activities={activities} />}
      {!loading && tab === 'wins' && <WinWall wins={wins} />}
    </div>
  )
}
