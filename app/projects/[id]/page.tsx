// app/projects/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectTasks, getProjectNotes, getProjectLinks, getProjectAnalysis, getGithubCache } from '@/lib/queries/projects'
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getExpenseSummary, getRevenueTotal } from '@/lib/finance'
import NextStepCard from '@/components/project-detail/NextStepCard'
import AIAnalysisPanel from '@/components/project-detail/AIAnalysisPanel'

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
  const activeTasks = tasks.filter(t => !t.completed)
  const expenseSummary = getExpenseSummary(projectExpenses)
  const revenueTotal = getRevenueTotal(projectRevenue)

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
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8 flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{project.emoji}</span>
          <h1 className="text-xl font-bold text-gray-800">{project.name}</h1>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{project.stage}</span>
          <span>{{ low: '💰', medium: '💰💰', high: '💰💰💰' }[project.revenue_score ?? 'low']}</span>
        </div>
      </div>

      {/* Summary */}
      {project.summary && <p className="text-gray-600 text-sm">{project.summary}</p>}

      {/* Next Step */}
      <NextStepCard task={nextStep} />

      {/* Mini P&L */}
      <div className="bg-white rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs text-gray-400 mb-1">Revenue</div>
          <div className="font-bold text-teal-700">${revenueTotal.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">Expenses</div>
          <div className="font-bold text-red-500">${expenseSummary.total.toFixed(0)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">P&L</div>
          <div className={`font-bold ${revenueTotal - expenseSummary.total >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            ${(revenueTotal - expenseSummary.total).toFixed(0)}
          </div>
        </div>
      </div>

      {/* AI Analysis */}
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

      {/* Tasks */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Tasks ({activeTasks.length})</h3>
        {activeTasks.length === 0 && <p className="text-gray-400 text-sm">No tasks yet.</p>}
        {activeTasks.map(task => (
          <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="w-4 h-4 rounded border border-gray-300 shrink-0" />
            <span className="text-sm text-gray-800 flex-1">{task.title}</span>
            {task.is_next_step && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">NEXT</span>}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Notes</h3>
        {notes.length === 0 && <p className="text-gray-400 text-sm">No notes yet.</p>}
        {notes.slice(0, 5).map(note => (
          <div key={note.id} className="py-2 border-b border-gray-50 last:border-0">
            <p className="text-sm text-gray-800">{note.content}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(note as any).author?.name ?? 'Auto'} · {new Date(note.created_at).toLocaleDateString('en-AU')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
