import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { label, url, icon } = body

  if (!label?.trim() || !url?.trim()) {
    return NextResponse.json({ error: 'label and url required' }, { status: 400 })
  }

  // Get current max sort_order
  const { data: existing } = await supabase
    .from('project_links')
    .select('sort_order')
    .eq('project_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('project_links')
    .insert({ project_id: id, label: label.trim(), url: url.trim(), icon: icon || null, is_auto: false, sort_order: nextOrder })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: _projectId } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const linkId = searchParams.get('linkId')
  if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 })
  await supabase.from('project_links').delete().eq('id', linkId)
  return NextResponse.json({ ok: true })
}
