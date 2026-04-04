import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildWinSummaryPrompt, WIN_SUMMARY_SYSTEM } from '@/lib/ai'
import type { ActivityLogEntry } from '@/lib/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: WIN_SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const summary = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  return NextResponse.json({ summary })
}
