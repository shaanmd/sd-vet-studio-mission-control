// lib/email/device.ts
// Tiny user-agent → device classifier. Good enough for "mobile vs desktop"
// summaries on a campaign drill-down — not a substitute for a real UA parser.

import type { DeviceType } from '@/lib/types/database'

export function detectDevice(userAgent: string | null | undefined): DeviceType {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet|kindle|silk(?!.*mobile)/.test(ua)) return 'tablet'
  if (/iphone|ipod|android.*mobile|mobile|blackberry|opera mini|iemobile|webos|windows phone/.test(ua)) return 'mobile'
  if (/macintosh|windows|linux|cros|x11/.test(ua)) return 'desktop'
  return 'unknown'
}
