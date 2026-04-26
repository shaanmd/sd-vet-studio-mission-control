import { getResources } from '@/lib/queries/resources'
import TopBar from '@/components/TopBar'
import ResourcesClient from '@/components/resources/ResourcesClient'

export default async function ResourcesPage() {
  const resources = await getResources()
  return (
    <>
      <TopBar crumbs={['Resources']} />
      <div style={{ padding: '22px 28px', paddingBottom: 40 }}>
        <div className="mb-5">
          <h1
            className="font-bold leading-tight"
            style={{ fontFamily: 'Georgia, serif', fontSize: 26, color: '#1E6B5E', letterSpacing: -0.5 }}
          >
            🔗 Resources
          </h1>
          <p className="text-[13px] mt-1" style={{ color: '#9AA5AC' }}>Tools, links, and references for the studio</p>
        </div>
        <ResourcesClient resources={resources} />
      </div>
    </>
  )
}
