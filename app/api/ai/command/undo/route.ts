import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { UndoEntry } from '@/lib/ai'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { undo } = (await req.json()) as { undo: UndoEntry[] }
  if (!Array.isArray(undo)) {
    return NextResponse.json({ error: 'undo array required' }, { status: 400 })
  }

  const errors: string[] = []
  for (const entry of undo) {
    try {
      if (entry.kind === 'delete_row') {
        const { error } = await supabase.from(entry.table).delete().eq('id', entry.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('projects')
          .update({ summary: entry.prev_summary })
          .eq('id', entry.project_id)
        if (error) throw error
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Undo failed')
    }
  }

  return NextResponse.json({ ok: errors.length === 0, errors })
}
