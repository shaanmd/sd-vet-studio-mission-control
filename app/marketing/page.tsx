import { getContentItems } from '@/lib/queries/marketing'
import { getProjects } from '@/lib/queries/projects'
import TopBar from '@/components/TopBar'
import ToolLinksGrid from '@/components/marketing/ToolLinksGrid'
import ContentCalendar from '@/components/marketing/ContentCalendar'
import MediaSection from '@/components/marketing/MediaSection'
import CampaignsSection from '@/components/marketing/CampaignsSection'

export default async function MarketingPage() {
  const [items, projects] = await Promise.all([getContentItems(), getProjects()])
  const projectList = projects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji ?? '' }))
  return (
    <>
      <TopBar crumbs={['Marketing']} />
      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        <div className="mb-5">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E6B5E', letterSpacing: -0.5 }}
          >
            📣 Marketing
          </h1>
        </div>
        <CampaignsSection />
        <h2 className="font-semibold text-[12px] uppercase tracking-widest mb-3" style={{ color: '#9AA5AC' }}>Tools</h2>
        <ToolLinksGrid />
        <ContentCalendar items={items} projects={projectList} />
        <MediaSection />
      </div>
    </>
  )
}
