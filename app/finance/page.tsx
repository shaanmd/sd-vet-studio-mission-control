// app/finance/page.tsx
import { getExpenses, getRevenueEntries } from '@/lib/queries/revenue'
import { getProjects } from '@/lib/queries/projects'
import { getExpenseSummary, getRevenueTotal, filterCurrentMonth } from '@/lib/finance'
import TopBar from '@/components/TopBar'
import FinanceSplitPanel from '@/components/finance/FinanceSplitPanel'
import FinanceTopBarActions from '@/components/finance/FinanceTopBarActions'

export default async function FinancePage() {
  const [expenses, revenueEntries, projects] = await Promise.all([
    getExpenses(),
    getRevenueEntries(),
    getProjects(),
  ])

  const thisMonthExpenses = filterCurrentMonth(expenses, 'expense_date')
  const thisMonthRevenue = filterCurrentMonth(revenueEntries, 'revenue_date')
  const expenseSummary = getExpenseSummary(thisMonthExpenses as any)
  const revenueTotal = getRevenueTotal(thisMonthRevenue as any)
  const pnl = revenueTotal - expenseSummary.total
  const margin = revenueTotal > 0 ? Math.round((pnl / revenueTotal) * 100) : 0

  const monthLabel = new Date().toLocaleString('en-AU', { month: 'long', year: 'numeric' })

  const projectList = projects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji ?? '' }))

  return (
    <>
      <TopBar
        crumbs={['Finance']}
        right={<FinanceTopBarActions projects={projectList} />}
      />

      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        {/* Heading */}
        <div className="mb-5">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E6B5E', letterSpacing: -0.5 }}
          >
            💰 Finance
          </h1>
          <p className="text-[12.5px] mt-1" style={{ color: '#6B7A82' }}>
            {monthLabel} · month-to-date
          </p>
        </div>

        {/* 3 stat tiles */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {/* Revenue tile */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#9AA5AC' }}>
              Revenue this month
            </div>
            <div className="font-bold text-[28px] leading-none mb-1" style={{ color: '#1E2A35' }}>
              ${revenueTotal.toFixed(0)}
            </div>
          </div>

          {/* Expenses tile */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E8E2D6' }}>
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#9AA5AC' }}>
              Expenses this month
            </div>
            <div className="font-bold text-[28px] leading-none mb-1" style={{ color: '#C0392B' }}>
              ${expenseSummary.total.toFixed(0)}
            </div>
          </div>

          {/* P&L tile */}
          <div className="rounded-2xl p-5" style={{ background: '#FBF3DE', border: '1px solid #EFDDB0' }}>
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: '#B7791F' }}>
              Net P&L
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <div className="font-bold text-[28px] leading-none" style={{ color: pnl >= 0 ? '#1E6B5E' : '#C0392B' }}>
                {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
              </div>
              {revenueTotal > 0 && (
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#E8F4F0', color: '#1E6B5E' }}
                >
                  {margin}% margin
                </span>
              )}
            </div>
            <div className="flex gap-3 text-[11px]" style={{ color: '#B7791F' }}>
              {expenseSummary.shaanPaid > 0 && <span>Shaan paid ${expenseSummary.shaanPaid.toFixed(0)}</span>}
              {expenseSummary.debPaid > 0 && <span>Deb paid ${expenseSummary.debPaid.toFixed(0)}</span>}
            </div>
          </div>
        </div>

        {/* Split panel */}
        <FinanceSplitPanel
          expenses={expenses as any}
          revenueEntries={revenueEntries as any}
          projects={projectList}
        />
      </div>
    </>
  )
}
