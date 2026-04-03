import { getResources } from '@/lib/queries/resources'
import ResourceList from '@/components/resources/ResourceList'

export default async function ResourcesPage() {
  const resources = await getResources()
  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-5">🔗 Resources</h1>
      <ResourceList resources={resources} />
    </div>
  )
}
