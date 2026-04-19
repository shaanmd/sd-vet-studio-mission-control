import { describe, it, expect, vi, beforeEach } from 'vitest'
import { applyTaskPatch } from '@/lib/mutations/tasks'

const mockSingle = vi.fn()
const mockSupabase = {
  from: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('applyTaskPatch', () => {
  it('clears is_next_step on sibling tasks before setting it on the target', async () => {
    const calls: string[] = []
    mockSupabase.from.mockImplementation((table: string) => {
      calls.push(table)
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { project_id: 'proj-1' }, error: null }) }) }),
        update: (body: Record<string, unknown>) => ({
          eq: (col: string, val: string) => {
            calls.push(`update:${JSON.stringify(body)}:${col}=${val}`)
            return Promise.resolve({ error: null })
          },
        }),
      }
    })

    await applyTaskPatch(mockSupabase as never, 'task-123', { is_next_step: true })

    const clearIdx = calls.findIndex((c) => c.includes('"is_next_step":false'))
    const setIdx = calls.findIndex((c) => c.includes('"is_next_step":true'))
    expect(clearIdx).toBeGreaterThanOrEqual(0)
    expect(setIdx).toBeGreaterThanOrEqual(0)
    expect(clearIdx).toBeLessThan(setIdx)
  })

  it('passes through other fields without the clear-then-set logic', async () => {
    const updateCalls: string[] = []
    mockSupabase.from.mockImplementation(() => ({
      update: (body: Record<string, unknown>) => ({
        eq: (_col: string, _val: string) => {
          updateCalls.push(JSON.stringify(body))
          return Promise.resolve({ error: null })
        },
      }),
    }))

    await applyTaskPatch(mockSupabase as never, 'task-123', { title: 'New title' })

    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toBe('{"title":"New title"}')
  })
})
