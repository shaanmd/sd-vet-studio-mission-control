import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildWinSummaryPrompt, WIN_SUMMARY_SYSTEM } from '@/lib/ai'
import type { ActivityLogEntry } from '@/lib/types/database'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const wins: Pick<ActivityLogEntry, 'description' | 'created_at'>[] = body.wins ?? []

  if (wins.length === 0) {
    return NextResponse.json({ summary: 'No wins logged yet — get out there!' })
  }

  const userPrompt = buildWinSummaryPrompt(wins)

  const { text } = await generateText({
    model: 'anthropic/claude-sonnet-4.6',
    maxOutputTokens: 256,
    system: WIN_SUMMARY_SYSTEM,
    prompt: userPrompt,
  })

  return NextResponse.json({ summary: text.trim() })
}
