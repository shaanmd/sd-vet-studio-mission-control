import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEnergyTagPrompt, ENERGY_TAG_SYSTEM, parseEnergyResponse } from '@/lib/ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const taskTitle: string = body.title ?? ''

  if (!taskTitle.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const userPrompt = buildEnergyTagPrompt(taskTitle)

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16,
    system: ENERGY_TAG_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  const energy = parseEnergyResponse(raw)

  return NextResponse.json({ energy })
}
