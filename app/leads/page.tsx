'use client'
import { useState, useEffect } from 'react'
import LeadCard from '@/components/leads/LeadCard'
import AddLeadForm from '@/components/leads/AddLeadForm'

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'curious'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [leadsRes, projectsRes] = await Promise.all([
      fetch('/api/leads').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ])
    setLeads(Array.isArray(leadsRes) ? leadsRes : [])
    setProjects(Array.isArray(projectsRes) ? projectsRes : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? leads : leads.filter((l: any) => l.interest_level === filter)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">🎯 Leads</h1>
        <button onClick={() => setShowAdd(true)} className="bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-xl">+ Add Lead</button>
      </div>
      <div className="flex gap-2 mb-4">
        {(['all', 'hot', 'warm', 'curious'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize transition-colors ${filter === f ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {f === 'hot' ? '🔥 ' : f === 'warm' ? '👍 ' : f === 'curious' ? '🤷 ' : ''}{f}
          </button>
        ))}
      </div>
      {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}
      <div className="flex flex-col gap-2">
        {filtered.map((lead: any) => <LeadCard key={lead.id} lead={lead} />)}
        {!loading && filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No leads yet.</p>}
      </div>
      {showAdd && <AddLeadForm projects={projects} onClose={() => { setShowAdd(false); load() }} />}
    </div>
  )
}
