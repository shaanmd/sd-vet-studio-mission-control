// app/crm/page.tsx
import TopBar from '@/components/TopBar'
import Link from 'next/link'

export default function CRMPage() {
  return (
    <>
      <TopBar crumbs={['CRM', 'Clients']} />
      <div style={{ padding: '22px 28px' }}>
        <div className="mb-6">
          <h1
            className="font-bold leading-tight"
            style={{ fontSize: 28, color: '#0D2035', fontFamily: 'Georgia, serif' }}
          >
            👥 Clients
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
            Client records, comms log, and relationship context.
          </p>
        </div>

        <div
          className="rounded-2xl flex flex-col items-center justify-center text-center"
          style={{
            background: '#FFFFFF',
            border: '1px solid #E8E2D6',
            padding: '48px',
          }}
        >
          <div className="text-5xl mb-4">🤝</div>
          <h2
            className="font-bold mb-2"
            style={{ fontSize: 18, color: '#0D2035' }}
          >
            Client records coming soon
          </h2>
          <p className="text-sm mb-6 max-w-md" style={{ color: '#6B7280' }}>
            Convert a consulting project lead to a client, or link a consulting
            project to a client to start building your CRM.
          </p>
          <Link
            href="/projects?type=consulting"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#1E6B5E' }}
          >
            View consulting projects →
          </Link>
        </div>
      </div>
    </>
  )
}
