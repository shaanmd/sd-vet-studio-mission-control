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
import PulseStrip from '@/components/project-detail/PulseStrip'
import AccordionSection from '@/components/project-detail/AccordionSection'
import LaunchGates from '@/components/project-detail/LaunchGates'
import TypeAccordion from '@/components/project-detail/TypeAccordion'
import type { Meeting } from '@/components/meetings/MeetingsClient'
import type { LaunchGate, PulseTileValue } from '@/lib/types/database'


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

  const launchGates = (project.launch_gates ?? []) as LaunchGate[]
  const pulseValues = (project.pulse_values ?? []) as PulseTileValue[]

  const checkedGates = launchGates.filter(g => g.checked).length
  const totalGates = launchGates.length
  const gatesProgress = totalGates > 0
    ? `${checkedGates} of ${totalGates} · ${Math.round((checkedGates / totalGates) * 100)}%`
    : null

  async function handleSaveAnalysis(data: { income_potential: string; build_difficulty: string; recommendation: string; raw_output: string }) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('project_analysis')
      .upsert({ ...data, project_id: id, analysed_by: user.id, analysed_at: new Date().toISOString() }, { onConflict: 'project_id' })
  }

  const typeLabel: Record<string, string> = {
    website_build: '🌐 Website details',
    saas:          '💻 SaaS details',
    course:        '🎓 Course details',
    consulting:    '💼 Client details',
    other:         '📦 Project details',
  }

  return (
    <>
      <TopBar crumbs={['Projects', project.name]} />

      <div style={{ padding: '22px 28px', paddingBottom: 60, maxWidth: 900 }}>
        {/* ── Header ── */}
        <ProjectInlineEditor
          project={project}
          revenueTotal={revenueTotal}
          expenseTotal={expenseSummary.total}
          pnl={pnl}
        />

        {/* ── Next Step banner ── */}
        <div className="mb-5">
          <NextStepBanner task={nextStep} />
        </div>

        {/* ── Pulse strip ── */}
        <div className="mb-1">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#9AA5AC' }}>
              📈 Pulse · what matters for {project.project_type ? typeLabel[project.project_type]?.split(' ')[1]?.toLowerCase() ?? 'this project' : 'this project'}
            </span>
            <span className="text-[10px]" style={{ color: '#CDC3AE' }}>· click any number to update</span>
          </div>
          <PulseStrip
            projectId={id}
            projectType={project.project_type}
            pulseValues={pulseValues}
          />
        </div>

        {/* ── Type-specific accordion (open by default) ── */}
        {project.project_type && (
          <div className="mb-3">
            <AccordionSection
              icon=""
              title={typeLabel[project.project_type] ?? '📦 Project details'}
              defaultOpen
              accentBorder
            >
              <TypeAccordion project={project} />
            </AccordionSection>
          </div>
        )}

        {/* ── Launch gates accordion ── */}
        <div className="mb-3">
          <AccordionSection
            icon=""
            title="🚀 Launch gates"
            defaultOpen
            rightSlot={
              gatesProgress ? (
                <span className="text-[12px] font-medium" style={{ color: '#6B7A82' }}>
                  {gatesProgress}
                </span>
              ) : null
            }
          >
            <LaunchGates
              projectId={id}
              projectType={project.project_type}
              gates={launchGates}
            />
          </AccordionSection>
        </div>

        {/* ── Tasks accordion (open by default) ── */}
        <div className="mb-3">
          <AccordionSection
            icon=""
            title="✅ Tasks"
            defaultOpen
            rightSlot={
              <span className="text-[12px] font-medium" style={{ color: '#6B7A82' }}>
                {tasks.filter(t => !t.completed).length} open
              </span>
            }
          >
            <TaskList
              projectId={id}
              tasks={tasks}
              allProjects={allProjects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji }))}
            />
          </AccordionSection>
        </div>

        {/* ── Notes accordion ── */}
        <div className="mb-3">
          <AccordionSection
            icon=""
            title="📝 Notes"
            defaultOpen={notes.length > 0}
            rightSlot={
              notes.length > 0 ? (
                <span className="text-[12px] font-medium" style={{ color: '#6B7A82' }}>
                  {notes.length}
                </span>
              ) : null
            }
          >
              <NotesList projectId={id} notes={notes as any} />
          </AccordionSection>
        </div>

        {/* ── Links accordion (collapsed) ── */}
        <div className="mb-3">
          <AccordionSection
            icon=""
            title="🔗 Links"
            defaultOpen={links.length > 0}
            rightSlot={
              links.length > 0 ? (
                <span className="text-[12px] font-medium" style={{ color: '#6B7A82' }}>
                  {links.length}
                </span>
              ) : null
            }
          >
              <KeyLinks projectId={id} links={links} />
          </AccordionSection>
        </div>

        {/* ── Meetings accordion (collapsed) ── */}
        {projectMeetings.length > 0 && (
          <div className="mb-3">
            <AccordionSection
              icon=""
              title="📅 Meetings"
              defaultOpen={false}
              rightSlot={
                <span className="text-[12px] font-medium" style={{ color: '#6B7A82' }}>
                  {projectMeetings.length}
                </span>
              }
            >
              <ProjectMeetingsList projectId={id} projectName={project.name} meetings={projectMeetings} />
            </AccordionSection>
          </div>
        )}

        {/* ── Project settings accordion (collapsed) ── */}
        <div className="mb-3">
          <AccordionSection
            icon=""
            title="⚙️ Project settings"
            defaultOpen={false}
          >
            <ProjectOverviewCard project={project} bare />
          </AccordionSection>
        </div>

        {/* ── AI Analysis accordion (collapsed) ── */}
        <div className="mb-3">
          <AccordionSection
            icon=""
            title="🤖 AI analysis"
            defaultOpen={false}
          >
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
          </AccordionSection>
        </div>
      </div>
    </>
  )
}
