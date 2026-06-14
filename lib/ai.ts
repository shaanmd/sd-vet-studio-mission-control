// lib/ai.ts
// Pure prompt construction functions — no API calls, fully testable.

import type { Project, Task, ActivityLogEntry } from '@/lib/types/database'

// ── Next-step suggestion ──────────────────────────────────────────────────────

export function buildNextStepPrompt(
  project: Pick<Project, 'name' | 'stage' | 'summary' | 'revenue_score'>,
  tasks: Pick<Task, 'title' | 'completed'>[],
): string {
  const pending = tasks
    .filter(t => !t.completed)
    .map(t => `- ${t.title}`)
    .join('\n')
  return (
    `Project: ${project.name} (${project.stage})\n` +
    `Summary: ${project.summary ?? 'No summary'}\n` +
    `Revenue score: ${project.revenue_score}\n` +
    `Pending tasks:\n${pending || 'None'}`
  )
}

export const NEXT_STEP_SYSTEM = `You are a lean startup advisor for SD VetStudio, a veterinary digital health company run by Dr Shaan Mocke and Dr Deb Prattley. Your job: suggest ONE specific next action to move a project toward revenue.

Respond with JSON only:
{"task": "specific actionable title under 10 words", "energy": "low|medium|high", "why": "one sentence reason focused on revenue impact"}

Energy guide:
- low: brain-off, 5-10 min (checking stats, copy-paste tasks)
- medium: needs focus, 15-30 min (writing, designing, configuring)
- high: deep work, 30+ min (building, strategy, complex decisions)`

// ── Win summary ───────────────────────────────────────────────────────────────

export function buildWinSummaryPrompt(
  wins: Pick<ActivityLogEntry, 'description' | 'created_at'>[],
): string {
  return wins
    .slice(0, 10)
    .map(
      w =>
        `- ${w.description ?? 'Win logged'} (${new Date(w.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})`,
    )
    .join('\n')
}

export const WIN_SUMMARY_SYSTEM = `You are a warm, energising coach for Dr Shaan and Dr Deb at SD VetStudio. Write a SHORT celebration of their recent wins — 2-3 sentences, specific, warm, focused on momentum. Address them as "you two". No emojis.`

// ── Energy tagger ─────────────────────────────────────────────────────────────

export function buildEnergyTagPrompt(taskTitle: string): string {
  return `Task: ${taskTitle}`
}

export const ENERGY_TAG_SYSTEM = `Tag this task with an energy level for veterinary clinic owners running a SaaS business.
Energy levels:
- low: brain-off execution, 5-10 min
- medium: focused work, 15-30 min
- high: deep strategic work, 30+ min

Respond with exactly one word: low, medium, or high`

export function parseEnergyResponse(response: string): 'low' | 'medium' | 'high' {
  const cleaned = response.trim().toLowerCase()
  if (cleaned === 'low' || cleaned === 'medium' || cleaned === 'high') return cleaned
  return 'medium'
}

// ── Next-step response parser ─────────────────────────────────────────────────

export interface NextStepResult {
  task: string
  energy: 'low' | 'medium' | 'high'
  why: string
}

export function parseNextStepResponse(raw: string): NextStepResult {
  try {
    // Strip markdown code fences if Claude wraps in ```json
    const cleaned = raw.replace(/```(?:json)?\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    const energy =
      parsed.energy === 'low' || parsed.energy === 'high' ? parsed.energy : 'medium'
    return {
      task: String(parsed.task ?? 'Review project status'),
      energy,
      why: String(parsed.why ?? ''),
    }
  } catch {
    return { task: raw.trim().slice(0, 80), energy: 'medium', why: '' }
  }
}

// ── Quick-capture command box ─────────────────────────────────────────────────

export type ProposedAction =
  | {
      kind: 'create_task'
      target: 'personal' | 'project'
      project_id: string | null
      project_name: string | null
      title: string
    }
  | {
      kind: 'update_summary'
      project_id: string
      project_name: string
      summary: string
    }

export type UndoEntry =
  | { kind: 'delete_row'; table: 'personal_tasks' | 'tasks'; id: string }
  | { kind: 'restore_summary'; project_id: string; prev_summary: string | null }

export interface ToolUse {
  name: string
  input: Record<string, unknown>
}

export const COMMAND_SYSTEM = `You are the quick-capture assistant for SD VetStudio's Mission Control, used by Dr Shaan and Dr Deb. Turn the user's free text into tool calls.

Rules:
- To capture a to-do, call create_task. If the text clearly refers to one of the listed projects, set project_id to that project's id; otherwise omit project_id (it becomes a personal task).
- Create one create_task call per distinct task.
- To (re)write a project's summary, call generate_project_summary with that project's id and any extra context the user gave in extra_notes.
- Only use project ids from the provided list. If unsure which project, omit project_id (personal task).
- If the text is not an actionable request, do not call any tool.`

export const COMMAND_TOOLS = [
  {
    name: 'create_task',
    description: 'Create a to-do. Set project_id when the task belongs to a named project; omit for a personal next-step task.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Short actionable task title' },
        project_id: { type: 'string', description: 'Id of the project this task belongs to, if any' },
      },
      required: ['title'],
    },
  },
  {
    name: 'generate_project_summary',
    description: "Write or rewrite a project's summary from its data plus any extra notes.",
    input_schema: {
      type: 'object' as const,
      properties: {
        project_id: { type: 'string', description: 'Id of the project to summarise' },
        extra_notes: { type: 'string', description: 'Extra context the user provided' },
      },
      required: ['project_id'],
    },
  },
]

interface ParsedTools {
  taskActions: Extract<ProposedAction, { kind: 'create_task' }>[]
  summaryRequests: { project_id: string; project_name: string; extra_notes: string | null }[]
}

export function parseToolUses(
  toolUses: ToolUse[],
  projectsById: Record<string, { name: string }>,
): ParsedTools {
  const taskActions: ParsedTools['taskActions'] = []
  const summaryRequests: ParsedTools['summaryRequests'] = []

  for (const tu of toolUses) {
    if (tu.name === 'create_task') {
      const title = String(tu.input.title ?? '').trim()
      if (!title) continue
      const rawId = tu.input.project_id ? String(tu.input.project_id) : null
      const known = rawId && projectsById[rawId] ? rawId : null
      taskActions.push({
        kind: 'create_task',
        target: known ? 'project' : 'personal',
        project_id: known,
        project_name: known ? projectsById[known].name : null,
        title,
      })
    } else if (tu.name === 'generate_project_summary') {
      const rawId = tu.input.project_id ? String(tu.input.project_id) : null
      if (!rawId || !projectsById[rawId]) continue
      const notes = tu.input.extra_notes ? String(tu.input.extra_notes).trim() : null
      summaryRequests.push({
        project_id: rawId,
        project_name: projectsById[rawId].name,
        extra_notes: notes || null,
      })
    }
  }

  return { taskActions, summaryRequests }
}

export function validateAction(
  action: ProposedAction,
  projectIds: Set<string>,
): { ok: true } | { ok: false; error: string } {
  if (action.kind === 'create_task') {
    if (!action.title.trim()) return { ok: false, error: 'Task title is empty' }
    if (action.target === 'project' && (!action.project_id || !projectIds.has(action.project_id))) {
      return { ok: false, error: 'Unknown project' }
    }
    return { ok: true }
  }
  // update_summary
  if (!projectIds.has(action.project_id)) return { ok: false, error: 'Unknown project' }
  if (!action.summary.trim()) return { ok: false, error: 'Summary is empty' }
  return { ok: true }
}

export function buildSummaryPrompt(
  project: { name: string; stage: string; summary: string | null; tasks: { title: string; completed: boolean }[] },
  extraNotes: string | null,
): string {
  const tasks = project.tasks.map(t => `- [${t.completed ? 'x' : ' '}] ${t.title}`).join('\n') || 'None'
  return (
    `Project: ${project.name} (${project.stage})\n` +
    `Existing summary: ${project.summary ?? 'None'}\n` +
    `Tasks:\n${tasks}\n` +
    `Extra notes from user: ${extraNotes ?? 'None'}`
  )
}

export const SUMMARY_SYSTEM = `You write concise project summaries for SD VetStudio's Mission Control. Given a project's data and any extra notes, write a clear 2-3 sentence summary of what the project is and where it stands. Plain text only, no preamble, no markdown headings.`
