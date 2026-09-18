// The 7am cron request carries no user cookies, so a cookie-based anon client
// hits `auth.role() = 'authenticated'` RLS policies on tasks/projects/cycles
// and silently reads back nothing — the digest sends with empty sections.
// The cron must use the service-role client instead.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendDailyDigest = vi.fn().mockResolvedValue({ ok: true, env: {}, results: [] })
const createServiceClient = vi.fn(() => ({ __kind: 'service' }))
const createCookieClient = vi.fn(async () => ({ __kind: 'cookie' }))

vi.mock('@/lib/email/daily-digest', () => ({ sendDailyDigest }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient }))
vi.mock('@/lib/supabase/server', () => ({ createClient: createCookieClient }))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.CRON_SECRET
})

describe('daily digest cron route', () => {
  it('sends the digest with a service-role client, not the cookie client', async () => {
    const { GET } = await import('@/app/api/email/daily-digest/route')

    await GET(new Request('https://example.com/api/email/daily-digest'))

    expect(createServiceClient).toHaveBeenCalled()
    expect(createCookieClient).not.toHaveBeenCalled()
    expect(sendDailyDigest).toHaveBeenCalledWith({ __kind: 'service' })
  })
})
