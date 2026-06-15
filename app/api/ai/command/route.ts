import { generateText, tool } from 'ai'
import { z } from 'zod'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjects, getProject } from '@/lib/queries/projects'
import {
  COMMAND_SYSTEM,
  SUMMARY_SYSTEM,
  buildSummaryPrompt,
  parseToolUses,
  type ProposedAction,
  type ToolUse,
} from '@/lib/ai'

const commandTools = {
  create_task: tool({
    description: 'Create a to-do. Set project_id when the task belongs to a named project; omit for a personal next-step task.',
    inputSchema: z.object({
      title: z.string().describe('Short actionable task title'),
      project_id: z.string().optional().describe('Id of the project this task belongs to, if any'),
    }),
  }),
  generate_project_summary: tool({
    description: "Write or rewrite a project's summary from its data plus any extra notes.",
    inputSchema: z.object({
      project_id: z.string().describe('Id of the project to summarise'),
      extra_notes: z.string().optional().describe('Extra context the user provided'),
    }),
  }),
}

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

  const result = await generateText({
    model: 'anthropic/claude-sonnet-4.6',
    maxOutputTokens: 1024,
    system: COMMAND_SYSTEM,
    tools: commandTools,
    prompt: `Projects:\n${projectList}\n\nUser request:\n${text}`,
  })

  const toolUses: ToolUse[] = result.toolCalls.map(tc => ({
    name: tc.toolName,
    input: tc.input as Record<string, unknown>,
  }))

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
    const { text: summary } = await generateText({
      model: 'anthropic/claude-sonnet-4.6',
      maxOutputTokens: 400,
      system: SUMMARY_SYSTEM,
      prompt,
    })
    const trimmed = summary.trim()
    if (trimmed) {
      summaryActions.push({
        kind: 'update_summary',
        project_id: reqSummary.project_id,
        project_name: reqSummary.project_name,
        summary: trimmed,
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
