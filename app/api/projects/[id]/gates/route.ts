import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { LaunchGate } from '@/lib/types/database'

// PATCH /api/projects/[id]/gates
// Body: { gates: LaunchGate[] }
// Replaces the entire launch_gates array for the project.

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { gates: LaunchGate[] }
  if (!Array.isArray(body.gates)) {
    return NextResponse.json({ error: 'gates must be an array' }, { status: 400 })
  }

  const { error } = await supabase
    .from('projects')
    .update({ launch_gates: body.gates, updated_by: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
