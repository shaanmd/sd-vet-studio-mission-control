import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildEnergyTagPrompt, ENERGY_TAG_SYSTEM, parseEnergyResponse } from '@/lib/ai'

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

  const { text } = await generateText({
    model: 'anthropic/claude-haiku-4.5',
    maxOutputTokens: 16,
    system: ENERGY_TAG_SYSTEM,
    prompt: userPrompt,
  })

  const energy = parseEnergyResponse(text)

  return NextResponse.json({ energy })
}
