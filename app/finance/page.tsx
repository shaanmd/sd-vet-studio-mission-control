// app/finance/page.tsx
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getProjects } from '@/lib/queries/projects'
import FinanceTabs from '@/components/finance/FinanceTabs'

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const [expenses, revenueEntries, projects] = await Promise.all([
    getExpenses(),
    getRevenueEntries(),
    getProjects(),
  ])

  const defaultTab = params.tab === 'revenue' ? 'revenue' : 'expenses'

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">💰 Finance</h1>
      <FinanceTabs
        expenses={expenses as any}
        revenueEntries={revenueEntries as any}
        projects={projects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji ?? '' }))}
        defaultTab={defaultTab}
      />
    </div>
  )
}
