import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjects, getProject } from '@/lib/queries/projects'
import {
  COMMAND_SYSTEM,
  COMMAND_TOOLS,
  SUMMARY_SYSTEM,
  buildSummaryPrompt,
  parseToolUses,
  type ProposedAction,
  type ToolUse,
} from '@/lib/ai'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await req.json()
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const projects = await getProjects()
  const projectsById = Object.fromEntries(projects.map(p => [p.id, { name: p.name }]))
  const projectList = projects.map(p => `- ${p.name} (id: ${p.id}, stage: ${p.stage})`).join('\n') || 'None'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: COMMAND_SYSTEM,
    tools: COMMAND_TOOLS,
    messages: [{ role: 'user', content: `Projects:\n${projectList}\n\nUser request:\n${text}` }],
  })

  const toolUses: ToolUse[] = message.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    .map(b => ({ name: b.name, input: b.input as Record<string, unknown> }))

  const { taskActions, summaryRequests } = parseToolUses(toolUses, projectsById)

  const summaryActions: ProposedAction[] = []
  for (const reqSummary of summaryRequests) {
    const project = await getProject(reqSummary.project_id)
    if (!project) continue
    const prompt = buildSummaryPrompt(
      {
        name: project.name,
        stage: project.stage,
        summary: project.summary,
        tasks: (project.tasks ?? []).map(t => ({ title: t.title, completed: t.completed })),
      },
      reqSummary.extra_notes,
    )
    const sum = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })
    const summary = sum.content[0]?.type === 'text' ? sum.content[0].text.trim() : ''
    if (summary) {
      summaryActions.push({
        kind: 'update_summary',
        project_id: reqSummary.project_id,
        project_name: reqSummary.project_name,
        summary,
      })
    }
  }

  const actions: ProposedAction[] = [...taskActions, ...summaryActions]
  const responseMessage =
    actions.length === 0
      ? "I couldn't turn that into an action. Try e.g. \"add a task to email the vet\" or \"summarise the Mockingbird project\"."
      : null

  return NextResponse.json({ actions, message: responseMessage })
}
