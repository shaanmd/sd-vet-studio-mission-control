'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AddLeadForm from './AddLeadForm'
import EditLeadModal from './EditLeadModal'
import { channelMeta, broughtInByLabel } from './sourceConstants'
import type { SourceChannel, BroughtInBy } from '@/lib/types/database'

const INTEREST_STYLE: Record<string, { bg: string; color: string }> = {
  hot:     { bg: '#FDECEA', color: '#C0392B' },
  warm:    { bg: '#FDF3E0', color: '#B7791F' },
  curious: { bg: '#F3F4F6', color: '#6B7280' },
}
const INTEREST_EMOJI: Record<string, string> = { hot: '🔥', warm: '👍', curious: '🤷' }

interface Lead {
  id: string
  name: string
  role_clinic?: string | null
  interest_level: string
  source?: string | null
  source_channel?: SourceChannel | null
  brought_in_by?: BroughtInBy | null
  contact_email?: string | null
  is_beta_tester?: boolean
  project: { name: string; emoji: string }
  added_by_profile?: { name: string } | null
  converted_contact_id?: string | null
}

interface Props {
  leads: Lead[]
  projects: Array<{ id: string; name: string; emoji: string }>
}

export default function LeadsClient({ leads, projects }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'curious'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const filtered = filter === 'all' ? leads : leads.filter(l => l.interest_level === filter)

  const counts = {
    hot: leads.filter(l => l.interest_level === 'hot').length,
    warm: leads.filter(l => l.interest_level === 'warm').length,
    curious: leads.filter(l => l.interest_level === 'curious').length,
  }

  return (
    <>
      {/* Filters + Add button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5">
          {(['all', 'hot', 'warm', 'curious'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-colors"
              style={
                filter === f
                  ? { background: '#1E2A35', color: '#fff' }
                  : { background: '#fff', color: '#6B7A82', border: '1px solid #E8E2D6' }
              }
            >
              {f !== 'all' && INTEREST_EMOJI[f] + ' '}
              {f === 'all' ? `All · ${leads.length}` : `${f} · ${counts[f]}`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white"
          style={{ background: '#1E6B5E' }}
        >
          + Add Lead
        </button>
      </div>

      {/* Lead list */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="text-center py-8 text-[13px]" style={{ color: '#9AA5AC' }}>No leads in this category.</p>
        )}
        {filtered.map(lead => {
          const style = INTEREST_STYLE[lead.interest_level] ?? INTEREST_STYLE.curious
          return (
            <div
              key={lead.id}
              className="group rounded-xl px-4 py-3.5 flex items-start gap-3"
              style={{ background: '#fff', border: '1px solid #E8E2D6' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[18px] shrink-0 mt-0.5"
                style={{ background: '#F5F0E8' }}
              >
                {INTEREST_EMOJI[lead.interest_level]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold" style={{ color: '#1E2A35' }}>{lead.name}</span>
                  <button
                    onClick={() => setEditingLead(lead)}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: '#F5F0E8', color: '#6B7A82' }}
                  >
                    Edit
                  </button>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {lead.interest_level}
                  </span>
                  {lead.is_beta_tester && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E8F4F0', color: '#1E6B5E' }}>
                      Beta tester
                    </span>
                  )}
                  {lead.converted_contact_id && (
                    <a
                      href={`/crm/${lead.converted_contact_id}`}
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#E8F4F0', color: '#1E6B5E', textDecoration: 'none' }}
                      title="View contact"
                    >
                      👥 Contact →
                    </a>
                  )}
                </div>
                {lead.role_clinic && (
                  <div className="text-[12px] mt-0.5" style={{ color: '#6B7A82' }}>{lead.role_clinic}</div>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px]" style={{ color: '#9AA5AC' }}>
                  <span>{lead.project.emoji} {lead.project.name}</span>
                  {(() => {
                    const ch = channelMeta(lead.source_channel ?? null)
                    return ch ? <><span>·</span><span>{ch.emoji} {ch.label}</span></> : null
                  })()}
                  {lead.brought_in_by && <><span>·</span><span>via {broughtInByLabel(lead.brought_in_by)}</span></>}
                  {lead.source && <><span>·</span><span>{lead.source}</span></>}
                  {lead.contact_email && <><span>·</span><span>{lead.contact_email}</span></>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <AddLeadForm
          projects={projects}
          onClose={() => { setShowAdd(false); router.refresh() }}
        />
      )}
      {editingLead && (
        <EditLeadModal
          lead={editingLead as any}
          projects={projects}
          onClose={() => { setEditingLead(null); router.refresh() }}
        />
      )}
    </>
  )
}
