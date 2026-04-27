// components/leads/sourceConstants.ts
import type { SourceChannel, BroughtInBy } from '@/lib/types/database'

export const SOURCE_CHANNELS: { value: SourceChannel; label: string; emoji: string }[] = [
  { value: 'linkedin', label: 'LinkedIn',  emoji: '💼' },
  { value: 'email',    label: 'Email',     emoji: '📧' },
  { value: 'phone',    label: 'Phone',     emoji: '📱' },
  { value: 'personal', label: 'Personal',  emoji: '🤝' },
  { value: 'website',  label: 'Website',   emoji: '🌐' },
  { value: 'referral', label: 'Referral',  emoji: '👥' },
  { value: 'event',    label: 'Event',     emoji: '🎤' },
  { value: 'other',    label: 'Other',     emoji: '📦' },
]

export const BROUGHT_IN_BY: { value: BroughtInBy; label: string }[] = [
  { value: 'shaan', label: 'Shaan' },
  { value: 'deb',   label: 'Deb'   },
  { value: 'other', label: 'Other' },
]

export function channelMeta(value: SourceChannel | null | undefined) {
  return SOURCE_CHANNELS.find(c => c.value === value)
}

export function broughtInByLabel(value: BroughtInBy | null | undefined) {
  return BROUGHT_IN_BY.find(b => b.value === value)?.label
}
