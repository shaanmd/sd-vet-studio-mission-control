// app/projects/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectTasks, getProjectNotes, getProjectLinks, getProjectAnalysis } from '@/lib/queries/projects'
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getExpenseSummary, getRevenueTotal } from '@/lib/finance'
import TopBar from '@/components/TopBar'
import NextStepBanner from '@/components/project-detail/NextStepBanner'
import AIAnalysisPanel from '@/components/project-detail/AIAnalysisPanel'
import ProjectEditButton from '@/components/project-detail/ProjectEditButton'
import TaskList from '@/components/project-detail/TaskList'
import KeyLinks from '@/components/project-detail/KeyLinks'
import NotesList from '@/components/project-detail/NotesList'

const STAGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  building:  { bg: '#E8F4F0', color: '#1E6B5E', label: 'Building' },
  live:      { bg: '#D1FAE5', color: '#065F46', label: 'Live' },
  exploring: { bg: '#EDE9FE', color: '#5B21B6', label: 'Exploring' },
  someday:   { bg: '#F3F4F6', color: '#6B7280', label: 'Someday' },
  inbox:     { bg: '#FEF3C7', color: '#92400E', label: 'Inbox' },
  pinned:    { bg: '#FEF3C7', color: '#92400E', label: 'Pinned' },
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [project, tasks, notes, links, analysis, projectExpenses, projectRevenue] = await Promise.all([
    getProject(id).catch(() => null),
    getProjectTasks(id),
    getProjectNotes(id),
    getProjectLinks(id),
    getProjectAnalysis(id),
    getExpenses(id),
    getRevenueEntries(id),
  ])

  if (!project) notFound()

  const nextStep = tasks.find(t => t.is_next_step && !t.completed) ?? null
  const expenseSummary = getExpenseSummary(projectExpenses)
  const revenueTotal = getRevenueTotal(projectRevenue)
  const pnl = revenueTotal - expenseSummary.total
  const stageStyle = STAGE_STYLES[project.stage] ?? STAGE_STYLES.inbox

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
      <TopBar
        crumbs={['Projects', project.name]}
        right={
          <div className="flex items-center gap-2">
            <ProjectEditButton project={project} />
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[18px] transition-colors hover:bg-black/5"
              style={{ color: '#6B7A82' }}
              title="More options"
            >
              ⋯
            </button>
          </div>
        }
      />

      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        {/* Project header */}
        <div className="flex items-start gap-4 mb-4">
          <span style={{ fontSize: 48, lineHeight: 1 }}>{project.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1
                className="font-bold leading-tight"
                style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E2A35', letterSpacing: -0.5 }}
              >
                {project.name}
              </h1>
              <span
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={{ background: stageStyle.bg, color: stageStyle.color }}
              >
                {stageStyle.label}
              </span>
              {project.pinned && <span title="Pinned">📌</span>}
            </div>
            {project.summary && (
              <p className="text-[13px] mb-2" style={{ color: '#6B7A82' }}>{project.summary}</p>
            )}
            {/* Inline P&L stats */}
            <div className="flex items-center gap-4">
              <div className="text-[12px]">
                <span style={{ color: '#9AA5AC' }}>Revenue </span>
                <span className="font-bold" style={{ color: '#1E6B5E' }}>${revenueTotal.toFixed(0)}</span>
              </div>
              <div className="text-[12px]">
                <span style={{ color: '#9AA5AC' }}>Expenses </span>
                <span className="font-bold" style={{ color: '#C0392B' }}>${expenseSummary.total.toFixed(0)}</span>
              </div>
              <div className="text-[12px]">
                <span style={{ color: '#9AA5AC' }}>P&L </span>
                <span className="font-bold" style={{ color: pnl >= 0 ? '#1E6B5E' : '#C0392B' }}>
                  {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Step banner */}
        <div className="mb-5">
          <NextStepBanner task={nextStep} />
        </div>

        {/* Two-pane body */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
          {/* Left pane: Tasks + Notes */}
          <div className="flex flex-col gap-4">
            <TaskList projectId={id} tasks={tasks} />
            <NotesList projectId={id} notes={notes as any} />
          </div>

          {/* Right pane: AI Analysis + Key Links */}
          <div className="flex flex-col gap-4">
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
            <KeyLinks projectId={id} links={links} />
          </div>
        </div>
      </div>
    </>
  )
}
