'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { addLead, promoteToBeta } from '@/lib/mutations/leads'
import { useRouter } from 'next/navigation'
import type { Lead, InterestLevel } from '@/lib/types/database'
import { formatDistanceToNow } from '@/lib/utils/dates'

interface LeadsSectionProps {
  projectId: string
  leads: Lead[]
}

const interestIcons: Record<InterestLevel, string> = {
  hot: '\uD83D\uDD25',
  warm: '\uD83D\uDC4D',
  curious: '\uD83E\uDD37',
}

export function LeadsSection({ projectId, leads }: LeadsSectionProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [roleClinic, setRoleClinic] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [source, setSource] = useState('')
  const [interest, setInterest] = useState<InterestLevel>('warm')
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const betaTesters = leads.filter((l) => l.is_beta_tester)
  const regularLeads = leads.filter((l) => !l.is_beta_tester)
  const feedbackPending = betaTesters.filter((l) => l.beta_feedback_status === 'awaiting').length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !user) return
    setSaving(true)
    try {
      await addLead({
        project_id: projectId,
        name: name.trim(),
        role_clinic: roleClinic.trim() || undefined,
        contact_email: contactEmail.trim() || undefined,
        source: source.trim() || undefined,
        interest_level: interest,
        added_by: user.id,
      })
      setName('')
      setRoleClinic('')
      setContactEmail('')
      setSource('')
      setInterest('warm')
      setShowAdd(false)
      router.refresh()
    } catch {
      alert('Failed to add lead.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePromote(leadId: string) {
    try {
      await promoteToBeta(leadId)
      router.refresh()
    } catch {
      alert('Failed to promote to beta.')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-black/[0.08] overflow-hidden mb-4">
      <div className="px-3.5 py-3 border-b border-black/5 flex justify-between items-center">
        <div>
          <div className="text-[11px] uppercase tracking-[2px] text-[#1E6B5E] font-semibold">
            Leads & Beta Testers
          </div>
          {leads.length > 0 && (
            <div className="text-[10px] text-[#8899a6] mt-0.5">
              {regularLeads.length} leads &middot; {betaTesters.length} beta testers
              {feedbackPending > 0 && ` \u00B7 ${feedbackPending} feedback pending`}
            </div>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} className="text-xs text-[#1E6B5E] font-medium">
          + Add Lead
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="px-3.5 py-3 border-b border-black/5 bg-[#F5F0E8]/50 space-y-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" required autoFocus />
          <input type="text" value={roleClinic} onChange={(e) => setRoleClinic(e.target.value)} placeholder="Role / Clinic" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" />
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" />
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="How they heard about it" className="w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1E6B5E]" />
          <div className="flex gap-2">
            {(['hot', 'warm', 'curious'] as InterestLevel[]).map((level) => (
              <button key={level} type="button" onClick={() => setInterest(level)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${interest === level ? 'bg-[#1E6B5E] text-white' : 'bg-white text-[#8899a6] border border-black/10'}`}>
                {interestIcons[level]} {level}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-[#1E6B5E] text-white text-xs font-semibold disabled:opacity-50">{saving ? 'Adding...' : 'Add Lead'}</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-black/10 text-xs text-[#8899a6]">Cancel</button>
          </div>
        </form>
      )}

      {leads.length === 0 && !showAdd && (
        <div className="px-3.5 py-4 text-center text-sm text-[#8899a6]">No leads yet.</div>
      )}

      {leads.map((lead, i) => (
        <div key={lead.id} className={`px-3.5 py-3 ${i < leads.length - 1 ? 'border-b border-black/5' : ''}`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] font-medium text-[#2C3E50]">
                {interestIcons[lead.interest_level]} {lead.name}
                {lead.is_beta_tester && <span className="ml-1.5 text-[9px] bg-[#1E6B5E] text-white px-1.5 py-0.5 rounded-full">BETA</span>}
              </div>
              {lead.role_clinic && <div className="text-[11px] text-[#8899a6]">{lead.role_clinic}</div>}
              {lead.source && <div className="text-[11px] text-[#8899a6] italic">via {lead.source}</div>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#8899a6]">{formatDistanceToNow(lead.created_at)}</span>
              {!lead.is_beta_tester && (
                <button onClick={() => handlePromote(lead.id)} className="text-[10px] text-[#1E6B5E] hover:underline">
                  &rarr; Beta
                </button>
              )}
            </div>
          </div>
          {lead.is_beta_tester && (
            <div className="mt-1.5 text-[11px] text-[#8899a6]">
              Accepted: {lead.beta_accepted ?? 'pending'} &middot; Feedback: {lead.beta_feedback_status}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
