import { createClient } from '@/lib/supabase/server'
import TopBar from '@/components/TopBar'
import MeetingsClient from '@/components/meetings/MeetingsClient'
import type { Meeting } from '@/components/meetings/MeetingsClient'

export default async function MeetingsPage() {
  const supabase = await createClient()

  const [{ data: meetingsData }, { data: projectsData }] = await Promise.all([
    supabase
      .from('meetings')
      .select('*, project:projects(id, name, emoji)')
      .order('scheduled_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, emoji')
      .neq('stage', 'archived')
      .order('name'),
  ])

  const meetings = (meetingsData ?? []) as Meeting[]
  const projects = (projectsData ?? []) as { id: string; name: string; emoji: string }[]

  return (
    <>
      <TopBar crumbs={['Meetings']} />
      <MeetingsClient meetings={meetings} projects={projects} />
    </>
  )
}
