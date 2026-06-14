// lib/__tests__/ai.test.ts
import { describe, it, expect } from 'vitest'
import {
  buildNextStepPrompt,
  buildWinSummaryPrompt,
  buildEnergyTagPrompt,
  parseEnergyResponse,
  parseNextStepResponse,
  parseToolUses,
  validateAction,
  buildSummaryPrompt,
  type ProposedAction,
} from '../ai'
import type { Project, Task, ActivityLogEntry } from '@/lib/types/database'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'VetRehab App',
  emoji: '🐾',
  summary: 'Rehab tracking for vets',
  stage: 'building',
  pinned: false,
  revenue_score: 'high',
  revenue_stream: ['subscription'],
  revenue_per_conversion: 49,
  github_repo: 'sdvetstudio/vetrehab',
  vercel_project_id: null,
  live_url: null,
  owner: null,
  goals: null,
  tech_stack: null,
  target_audience: null,
  domains: [],
  project_type: null,
  launch_gates: [],
  pulse_values: [],
  client_name: null,
  client_email: null,
  delivery_date: null,
  ga4_property_id: null,
  monthly_visitors: null,
  staging_url: null,
  key_docs: [],
  created_by: null,
  updated_by: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  project_id: 'p1',
  title: 'Set up Stripe',
  description: null,
  assigned_to: null,
  is_shared: false,
  is_next_step: false,
  energy: 'medium',
  due_date: null,
  recurrence: null,
  recurrence_next_due: null,
  completed: false,
  completed_at: null,
  completed_by: null,
  sort_order: 0,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

const makeWin = (overrides: Partial<ActivityLogEntry> = {}): ActivityLogEntry => ({
  id: 'w1',
  project_id: 'p1',
  actor_id: 'u1',
  action: 'revenue_logged',
  description: 'First paying customer signed up',
  metadata: null,
  is_win: true,
  created_at: '2026-04-01T00:00:00Z',
  ...overrides,
})

// ── buildNextStepPrompt ───────────────────────────────────────────────────────

describe('buildNextStepPrompt', () => {
  it('includes project name and stage', () => {
    const prompt = buildNextStepPrompt(makeProject(), [makeTask()])
    expect(prompt).toContain('VetRehab App (building)')
  })

  it('includes summary when present', () => {
    const prompt = buildNextStepPrompt(makeProject(), [])
    expect(prompt).toContain('Rehab tracking for vets')
  })

  it('falls back to "No summary" when summary is null', () => {
    const prompt = buildNextStepPrompt(makeProject({ summary: null }), [])
    expect(prompt).toContain('Summary: No summary')
  })

  it('lists only pending tasks', () => {
    const tasks = [
      makeTask({ title: 'Set up Stripe', completed: false }),
      makeTask({ id: 't2', title: 'Deploy to prod', completed: true }),
    ]
    const prompt = buildNextStepPrompt(makeProject(), tasks)
    expect(prompt).toContain('- Set up Stripe')
    expect(prompt).not.toContain('Deploy to prod')
  })

  it('shows "None" when all tasks are completed', () => {
    const tasks = [makeTask({ completed: true })]
    const prompt = buildNextStepPrompt(makeProject(), tasks)
    expect(prompt).toContain('Pending tasks:\nNone')
  })

  it('includes revenue_score', () => {
    const prompt = buildNextStepPrompt(makeProject({ revenue_score: 'high' }), [])
    expect(prompt).toContain('Revenue score: high')
  })
})

// ── buildWinSummaryPrompt ────────────────────────────────────────────────────

describe('buildWinSummaryPrompt', () => {
  it('formats wins with description and date', () => {
    const prompt = buildWinSummaryPrompt([makeWin()])
    expect(prompt).toContain('First paying customer signed up')
    expect(prompt).toContain('1 Apr')
  })

  it('falls back to "Win logged" when description is null', () => {
    const prompt = buildWinSummaryPrompt([makeWin({ description: null })])
    expect(prompt).toContain('Win logged')
  })

  it('limits to 10 wins', () => {
    const wins = Array.from({ length: 15 }, (_, i) =>
      makeWin({ id: `w${i}`, description: `Win ${i}` }),
    )
    const prompt = buildWinSummaryPrompt(wins)
    const lines = prompt.split('\n')
    expect(lines).toHaveLength(10)
  })

  it('returns empty string for empty array', () => {
    expect(buildWinSummaryPrompt([])).toBe('')
  })
})

// ── buildEnergyTagPrompt ──────────────────────────────────────────────────────

describe('buildEnergyTagPrompt', () => {
  it('wraps task title in expected format', () => {
    const prompt = buildEnergyTagPrompt('Write landing page copy')
    expect(prompt).toBe('Task: Write landing page copy')
  })
})

// ── parseEnergyResponse ───────────────────────────────────────────────────────

describe('parseEnergyResponse', () => {
  it('returns "low" for "low"', () => {
    expect(parseEnergyResponse('low')).toBe('low')
  })

  it('returns "medium" for "medium"', () => {
    expect(parseEnergyResponse('medium')).toBe('medium')
  })

  it('returns "high" for "high"', () => {
    expect(parseEnergyResponse('high')).toBe('high')
  })

  it('trims whitespace', () => {
    expect(parseEnergyResponse('  high  \n')).toBe('high')
  })

  it('is case-insensitive', () => {
    expect(parseEnergyResponse('HIGH')).toBe('high')
    expect(parseEnergyResponse('Low')).toBe('low')
  })

  it('defaults to "medium" for unexpected values', () => {
    expect(parseEnergyResponse('moderate')).toBe('medium')
    expect(parseEnergyResponse('')).toBe('medium')
    expect(parseEnergyResponse('Level: high')).toBe('medium')
  })
})

// ── parseNextStepResponse ─────────────────────────────────────────────────────

describe('parseNextStepResponse', () => {
  it('parses valid JSON', () => {
    const raw = JSON.stringify({
      task: 'Add Stripe checkout to onboarding',
      energy: 'high',
      why: 'Unlocks paying customers immediately',
    })
    const result = parseNextStepResponse(raw)
    expect(result.task).toBe('Add Stripe checkout to onboarding')
    expect(result.energy).toBe('high')
    expect(result.why).toBe('Unlocks paying customers immediately')
  })

  it('strips markdown code fences', () => {
    const raw =
      '```json\n{"task":"Email 5 beta users","energy":"low","why":"Quick feedback loop"}\n```'
    const result = parseNextStepResponse(raw)
    expect(result.task).toBe('Email 5 beta users')
    expect(result.energy).toBe('low')
  })

  it('defaults energy to "medium" for unexpected values', () => {
    const raw = JSON.stringify({ task: 'Do something', energy: 'extreme', why: 'test' })
    const result = parseNextStepResponse(raw)
    expect(result.energy).toBe('medium')
  })

  it('falls back gracefully on invalid JSON', () => {
    const result = parseNextStepResponse('Sorry, I cannot help with that.')
    expect(result.task).toBe('Sorry, I cannot help with that.')
    expect(result.energy).toBe('medium')
    expect(result.why).toBe('')
  })

  it('truncates fallback task to 80 chars', () => {
    const longText = 'A'.repeat(100)
    const result = parseNextStepResponse(longText)
    expect(result.task).toHaveLength(80)
  })
})

// ── parseToolUses ─────────────────────────────────────────────────────────────

describe('parseToolUses', () => {
  const projectsById = { p1: { name: 'Mockingbird' } }

  it('maps create_task with known project_id to a project task', () => {
    const { taskActions, summaryRequests } = parseToolUses(
      [{ name: 'create_task', input: { title: 'Email the vet', project_id: 'p1' } }],
      projectsById,
    )
    expect(summaryRequests).toEqual([])
    expect(taskActions).toEqual([
      { kind: 'create_task', target: 'project', project_id: 'p1', project_name: 'Mockingbird', title: 'Email the vet' },
    ])
  })

  it('maps create_task with no project_id to a personal task', () => {
    const { taskActions } = parseToolUses(
      [{ name: 'create_task', input: { title: 'Buy stamps' } }],
      projectsById,
    )
    expect(taskActions[0]).toEqual({
      kind: 'create_task', target: 'personal', project_id: null, project_name: null, title: 'Buy stamps',
    })
  })

  it('treats an unknown project_id as a personal task', () => {
    const { taskActions } = parseToolUses(
      [{ name: 'create_task', input: { title: 'Do thing', project_id: 'nope' } }],
      projectsById,
    )
    expect(taskActions[0].target).toBe('personal')
    expect(taskActions[0].project_id).toBeNull()
  })

  it('emits multiple task actions from multiple tool uses', () => {
    const { taskActions } = parseToolUses(
      [
        { name: 'create_task', input: { title: 'A' } },
        { name: 'create_task', input: { title: 'B' } },
      ],
      projectsById,
    )
    expect(taskActions).toHaveLength(2)
  })

  it('collects summary requests with known project_id only', () => {
    const { summaryRequests } = parseToolUses(
      [
        { name: 'generate_project_summary', input: { project_id: 'p1', extra_notes: 'signed contract' } },
        { name: 'generate_project_summary', input: { project_id: 'ghost' } },
      ],
      projectsById,
    )
    expect(summaryRequests).toEqual([
      { project_id: 'p1', project_name: 'Mockingbird', extra_notes: 'signed contract' },
    ])
  })

  it('ignores tasks with a blank title', () => {
    const { taskActions } = parseToolUses(
      [{ name: 'create_task', input: { title: '   ' } }],
      projectsById,
    )
    expect(taskActions).toEqual([])
  })
})

// ── validateAction ────────────────────────────────────────────────────────────

describe('validateAction', () => {
  const ids = new Set(['p1'])

  it('accepts a personal task with a title', () => {
    const a: ProposedAction = { kind: 'create_task', target: 'personal', project_id: null, project_name: null, title: 'X' }
    expect(validateAction(a, ids)).toEqual({ ok: true })
  })

  it('rejects an empty title', () => {
    const a: ProposedAction = { kind: 'create_task', target: 'personal', project_id: null, project_name: null, title: '' }
    expect(validateAction(a, ids).ok).toBe(false)
  })

  it('rejects a project task whose project_id is unknown', () => {
    const a: ProposedAction = { kind: 'create_task', target: 'project', project_id: 'ghost', project_name: 'x', title: 'X' }
    expect(validateAction(a, ids).ok).toBe(false)
  })

  it('rejects a summary update for an unknown project', () => {
    const a: ProposedAction = { kind: 'update_summary', project_id: 'ghost', project_name: 'x', summary: 'hi' }
    expect(validateAction(a, ids).ok).toBe(false)
  })

  it('accepts a valid summary update', () => {
    const a: ProposedAction = { kind: 'update_summary', project_id: 'p1', project_name: 'M', summary: 'hi' }
    expect(validateAction(a, ids)).toEqual({ ok: true })
  })
})

// ── buildSummaryPrompt ────────────────────────────────────────────────────────

describe('buildSummaryPrompt', () => {
  it('includes project name, stage, tasks, and extra notes', () => {
    const prompt = buildSummaryPrompt(
      { name: 'Mockingbird', stage: 'building', summary: 'old', tasks: [{ title: 'Ship MVP', completed: false }] },
      'we signed the contract',
    )
    expect(prompt).toContain('Mockingbird')
    expect(prompt).toContain('building')
    expect(prompt).toContain('Ship MVP')
    expect(prompt).toContain('we signed the contract')
  })

  it('handles no extra notes', () => {
    const prompt = buildSummaryPrompt(
      { name: 'X', stage: 'inbox', summary: null, tasks: [] },
      null,
    )
    expect(prompt).toContain('X')
  })
})
