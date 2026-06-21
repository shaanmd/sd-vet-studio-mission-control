import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public endpoints that authenticate themselves (cron secret / webhook
// signature) and must NOT be redirected to /login by the session gate.
const PUBLIC_PATHS = [
  '/api/email/daily-digest', // Vercel cron — validates CRON_SECRET internally
  '/api/webhooks/',          // inbound webhooks — verify their own signatures
]

export async function updateSession(request: NextRequest) {
  // Let self-authenticating public endpoints through untouched.
  if (PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the token AND refreshes it if expired.
  // getClaims() only decodes the JWT without refreshing — causes session expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
