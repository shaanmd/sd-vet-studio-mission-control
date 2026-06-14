import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getProjects } from '@/lib/queries/projects'
import { validateAction, type ProposedAction, type UndoEntry } from '@/lib/ai'

type ApplyResult =
  | { ok: true; label: string; undo: UndoEntry }
  | { ok: false; label: string; error: string }

function labelFor(a: ProposedAction): string {
  if (a.kind === 'create_task') {
    return a.target === 'project'
      ? `Task on ${a.project_name}: ${a.title}`
      : `Personal task: ${a.title}`
  }
  return `Summary updated: ${a.project_name}`
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { actions } = (await req.json()) as { actions: ProposedAction[] }
  if (!Array.isArray(actions)) {
    return NextResponse.json({ error: 'actions array required' }, { status: 400 })
  }

  const projectIds = new Set((await getProjects()).map(p => p.id))
  const results: ApplyResult[] = []

  for (const action of actions) {
    const label = labelFor(action)
    const valid = validateAction(action, projectIds)
    if (!valid.ok) {
      results.push({ ok: false, label, error: valid.error })
      continue
    }

    try {
      if (action.kind === 'create_task') {
        if (action.target === 'personal') {
          const { data, error } = await supabase
            .from('personal_tasks')
            .insert({ title: action.title, owner_id: user.id, project_id: null })
            .select('id')
            .single()
          if (error) throw error
          results.push({ ok: true, label, undo: { kind: 'delete_row', table: 'personal_tasks', id: data.id } })
        } else {
          const { data, error } = await supabase
            .from('tasks')
            .insert({ title: action.title, project_id: action.project_id })
            .select('id')
            .single()
          if (error) throw error
          results.push({ ok: true, label, undo: { kind: 'delete_row', table: 'tasks', id: data.id } })
        }
      } else {
        // update_summary — capture previous value for undo
        const { data: prev, error: readErr } = await supabase
          .from('projects')
          .select('summary')
          .eq('id', action.project_id)
          .single()
        if (readErr) throw readErr
        const { error } = await supabase
          .from('projects')
          .update({ summary: action.summary, updated_by: user.id })
          .eq('id', action.project_id)
        if (error) throw error
        results.push({
          ok: true,
          label,
          undo: { kind: 'restore_summary', project_id: action.project_id, prev_summary: prev.summary ?? null },
        })
      }
    } catch (e) {
      results.push({ ok: false, label, error: e instanceof Error ? e.message : 'Write failed' })
    }
  }

  return NextResponse.json({ results })
}
