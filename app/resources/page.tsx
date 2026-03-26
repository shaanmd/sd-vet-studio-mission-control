import { getResources } from '@/lib/queries/resources'
import { ResourceList } from '@/components/resources/ResourceList'

export default async function ResourcesPage() {
  const grouped = await getResources()

  return (
    <div className="p-5 max-w-lg mx-auto md:max-w-2xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#2C3E50]">Resources</h1>
        <p className="text-sm text-[#8899a6] mt-0.5">Shared logins, tools & quick links</p>
      </div>
      <ResourceList grouped={grouped} />
    </div>
  )
}
