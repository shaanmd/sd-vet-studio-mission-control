import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildNextStepPrompt, NEXT_STEP_SYSTEM, parseNextStepResponse } from '@/lib/ai'
import type { Project, Task } from '@/lib/types/database'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const project: Pick<Project, 'name' | 'stage' | 'summary' | 'revenue_score'> = body.project
  const tasks: Pick<Task, 'title' | 'completed'>[] = body.tasks ?? []

  if (!project?.name) {
    return NextResponse.json({ error: 'project is required' }, { status: 400 })
  }

  const userPrompt = buildNextStepPrompt(project, tasks)

  const { text } = await generateText({
    model: 'anthropic/claude-sonnet-4.6',
    maxOutputTokens: 256,
    system: NEXT_STEP_SYSTEM,
    prompt: userPrompt,
  })

  const result = parseNextStepResponse(text)

  return NextResponse.json(result)
}
