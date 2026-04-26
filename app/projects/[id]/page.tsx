// app/projects/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjects, getProjectTasks, getProjectNotes, getProjectLinks, getProjectAnalysis } from '@/lib/queries/projects'
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getExpenseSummary, getRevenueTotal } from '@/lib/finance'
import TopBar from '@/components/TopBar'
import NextStepBanner from '@/components/project-detail/NextStepBanner'
import AIAnalysisPanel from '@/components/project-detail/AIAnalysisPanel'
import ProjectInlineEditor from '@/components/project-detail/ProjectInlineEditor'
import TaskList from '@/components/project-detail/TaskList'
import KeyLinks from '@/components/project-detail/KeyLinks'
import NotesList from '@/components/project-detail/NotesList'
import ProjectOverviewCard from '@/components/project-detail/ProjectOverviewCard'
import ProjectMeetingsList from '@/components/project-detail/ProjectMeetingsList'
import type { Meeting } from '@/components/meetings/MeetingsClient'


export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [project, tasks, notes, links, analysis, projectExpenses, projectRevenue, allProjects, meetingsData] = await Promise.all([
    getProject(id).catch(() => null),
    getProjectTasks(id),
    getProjectNotes(id),
    getProjectLinks(id),
    getProjectAnalysis(id),
    getExpenses(id),
    getRevenueEntries(id),
    getProjects(),
    supabase.from('meetings').select('*, project:projects(id, name, emoji)').eq('linked_project_id', id).order('scheduled_at', { ascending: false }),
  ])

  const projectMeetings = (meetingsData.data ?? []) as Meeting[]

  if (!project) notFound()

  const nextStep = tasks.find(t => t.is_next_step && !t.completed) ?? null
  const expenseSummary = getExpenseSummary(projectExpenses)
  const revenueTotal = getRevenueTotal(projectRevenue)
  const pnl = revenueTotal - expenseSummary.total
  async function handleSaveAnalysis(data: { income_potential: string; build_difficulty: string; recommendation: string; raw_output: string }) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('project_analysis')
      .upsert({ ...data, project_id: id, analysed_by: user.id, analysed_at: new Date().toISOString() }, { onConflict: 'project_id' })
  }

  return (
    <>
      <TopBar crumbs={['Projects', project.name]} />

      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        {/* Inline editable header */}
        <ProjectInlineEditor
          project={project}
          revenueTotal={revenueTotal}
          expenseTotal={expenseSummary.total}
          pnl={pnl}
        />

        {/* Next Step banner */}
        <div className="mb-5">
          <NextStepBanner task={nextStep} />
        </div>

        {/* Two-pane body */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
          {/* Left pane: Tasks + Notes + AI Analysis */}
          <div className="flex flex-col gap-4">
            <TaskList
              projectId={id}
              tasks={tasks}
              allProjects={allProjects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }))}
            />
            <NotesList projectId={id} notes={notes as any} />
            <ProjectMeetingsList projectId={id} projectName={project.name} meetings={projectMeetings} />
            <AIAnalysisPanel
              projectId={id}
              projectName={project.name}
              projectStage={project.stage}
              projectSummary={project.summary}
              projectRevenueScore={project.revenue_score}
              pendingTasks={(tasks ?? []).filter(t => !t.completed).map(t => ({ title: t.title, completed: t.completed }))}
              analysis={analysis}
              onSave={handleSaveAnalysis}
            />
          </div>

          {/* Right pane: Overview + Key Links */}
          <div className="flex flex-col gap-4">
            <ProjectOverviewCard project={project} />
            <KeyLinks projectId={id} links={links} />
          </div>
        </div>
      </div>
    </>
  )
}
