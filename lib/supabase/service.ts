// lib/supabase/service.ts
// Service-role Supabase client for server-side processes that don't have a
// user session — webhooks, scheduled jobs. Bypasses RLS, so use sparingly
// and never expose to the client.
//
// Requires SUPABASE_SERVICE_ROLE_KEY env var (set in Vercel only).

import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
