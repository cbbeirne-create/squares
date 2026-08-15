import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl

  // ── Subdomain routing ─────────────────────────────────────
  // If on a custom subdomain (e.g. munster.stadiumsquares.io),
  // rewrite to /board/[slug]
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'stadiumsquares.io'
  const isSubdomain = hostname !== appDomain &&
                      hostname !== `www.${appDomain}` &&
                      hostname !== 'localhost' &&
                      !hostname.includes('vercel.app')

  if (isSubdomain) {
    const slug = hostname.split('.')[0]
    if (!pathname.startsWith('/board') && !pathname.startsWith('/api')) {
      return NextResponse.rewrite(new URL(`/board/${slug}${pathname}`, req.url))
    }
  }

  // ── Auth protection ───────────────────────────────────────
  const isAdminRoute      = pathname.startsWith('/admin')
  const isSuperAdminRoute = pathname.startsWith('/superadmin')

  if (!isAdminRoute && !isSuperAdminRoute) {
    return NextResponse.next()
  }

  // Verify session
  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Cookies must be set on both the incoming request (so this
          // middleware's own supabase client sees them) and the outgoing
          // response (so the browser actually receives them) — mismatching
          // these two is the most common cause of sessions silently
          // dropping in Next.js middleware.
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Super admin routes require super_admin role
  if (isSuperAdminRoute) {
    const { data: appUser } = await supabase
      .from('app_users').select('role').eq('id', user.id).single()
    if (appUser?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/admin/moderation', req.url))
    }
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
}
