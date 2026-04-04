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
