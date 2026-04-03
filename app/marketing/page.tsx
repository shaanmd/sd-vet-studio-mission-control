import { getContentItems } from '@/lib/queries/marketing'
import { getProjects } from '@/lib/queries/projects'
import ToolLinksGrid from '@/components/marketing/ToolLinksGrid'
import ContentCalendar from '@/components/marketing/ContentCalendar'

export default async function MarketingPage() {
  const [items, projects] = await Promise.all([getContentItems(), getProjects()])
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">📣 Marketing</h1>
      <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Tools</h2>
      <ToolLinksGrid />
      <ContentCalendar
        items={items}
        projects={projects.map(p => ({ id: p.id, name: p.name, emoji: p.emoji ?? '' }))}
      />
    </div>
  )
}
