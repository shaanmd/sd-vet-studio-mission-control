import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { PulseTileValue } from '@/lib/types/database'

// PATCH /api/projects/[id]/pulse
// Body: { tile_id: string; value: number | null }
// Upserts a single pulse tile value in the project's pulse_values JSONB array.

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { tile_id: string; value: number | null }
  if (!body.tile_id) return NextResponse.json({ error: 'tile_id required' }, { status: 400 })

  // Fetch current pulse_values
  const { data: project, error: fetchErr } = await supabase
    .from('projects')
    .select('pulse_values')
    .eq('id', id)
    .single()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const existing: PulseTileValue[] = (project?.pulse_values as PulseTileValue[]) ?? []
  const idx = existing.findIndex(pv => pv.tile_id === body.tile_id)

  let updated: PulseTileValue[]
  if (idx >= 0) {
    updated = existing.map((pv, i) => i === idx ? { ...pv, value: body.value } : pv)
  } else {
    updated = [...existing, { tile_id: body.tile_id, value: body.value }]
  }

  const { error } = await supabase
    .from('projects')
    .update({ pulse_values: updated, updated_by: user.id })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
