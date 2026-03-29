import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          // Bypass navigator.locks to prevent orphaned lock deadlocks
          // caused by React Strict Mode double-mounting components.
          // Token refresh is handled server-side by the proxy middleware.
          // See: https://github.com/supabase/supabase-js/issues/2111
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
        },
      }
    )
  }
  return browserClient
}
