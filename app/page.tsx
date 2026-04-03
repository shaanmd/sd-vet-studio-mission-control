// app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getActiveTasksWithProjects } from '@/lib/queries/projects'
import { getRevenueEntries } from '@/lib/queries/revenue'
import RevenueTiles from '@/components/home/RevenueTiles'
import MoneyMovesList from '@/components/home/MoneyMovesList'
import WinStreak from '@/components/home/WinStreak'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [movesData, revenueEntries] = await Promise.all([
    getActiveTasksWithProjects(),
    getRevenueEntries(),
  ])

  // Count tasks completed this week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const { count: weeklyWins } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('completed', true)
    .gte('completed_at', weekStart.toISOString())

  async function handleComplete(taskId: string) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('id', taskId)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-teal-700">SD VetStudio</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      <RevenueTiles entries={revenueEntries} />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">💰 Your Money Moves</h2>
      </div>
      <div className="mb-4">
        <MoneyMovesList moves={movesData} onComplete={handleComplete} />
      </div>

      <div className="mb-6">
        <WinStreak completedThisWeek={weeklyWins ?? 0} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <a href="/projects" className="bg-white rounded-xl p-3 text-center text-sm font-medium text-teal-700 shadow-sm">+ Add Idea</a>
        <a href="/projects" className="bg-white rounded-xl p-3 text-center text-sm font-medium text-gray-700 shadow-sm">All Projects</a>
        <a href="/finance" className="bg-white rounded-xl p-3 text-center text-sm font-medium text-amber-600 shadow-sm">Log Revenue</a>
      </div>
    </div>
  )
}
