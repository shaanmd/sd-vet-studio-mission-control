import type { Lead } from '@/lib/types/database'

const INTEREST_EMOJI: Record<string, string> = { hot: '🔥', warm: '👍', curious: '🤷' }
const INTEREST_STYLE: Record<string, string> = {
  hot: 'bg-red-50 text-red-600',
  warm: 'bg-amber-50 text-amber-600',
  curious: 'bg-gray-100 text-gray-500',
}

interface LeadWithRelations extends Lead {
  project: { name: string; emoji: string }
  added_by_profile: { name: string } | null
}

interface Props {
  lead: LeadWithRelations
}

export default function LeadCard({ lead }: Props) {
  return (
    <div className="bg-white rounded-xl px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <div className="font-semibold text-gray-800">{lead.name}</div>
          {lead.role_clinic && <div className="text-xs text-gray-500">{lead.role_clinic}</div>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${INTEREST_STYLE[lead.interest_level]}`}>
          {INTEREST_EMOJI[lead.interest_level]} {lead.interest_level}
        </span>
      </div>
      <div className="text-xs text-gray-400 flex flex-wrap gap-2 mt-1">
        <span>{lead.project.emoji} {lead.project.name}</span>
        {lead.source && <span>· {lead.source}</span>}
        {lead.contact_email && <span>· {lead.contact_email}</span>}
        {lead.is_beta_tester && <span className="text-teal-600 font-medium">· Beta tester</span>}
      </div>
    </div>
  )
}
