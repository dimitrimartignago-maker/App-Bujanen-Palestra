import { createServerClient } from '@supabase/ssr'
import { type ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { type NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/signup']

function getRoleDashboard(role: string | undefined): string {
  if (role === 'trainer') return '/trainer'
  if (role === 'client') return '/client'
  return '/login'
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must call getUser() not getSession()
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  console.log(`[middleware] ${pathname} | user=${user?.id ?? 'none'} | role=${user?.user_metadata?.role ?? 'none'} | getUserError=${getUserError?.message ?? 'none'}`)

  // Authenticated user visiting a public (auth) route → send to their dashboard
  // Only redirect if they have a recognized role; otherwise let them stay (avoids loop)
  if (user && isPublicRoute) {
    const role = user.user_metadata?.role as string | undefined
    if (role === 'trainer' || role === 'client') {
      console.log(`[middleware] redirecting authenticated user from ${pathname} → ${getRoleDashboard(role)}`)
      return NextResponse.redirect(new URL(getRoleDashboard(role), request.url))
    }
  }

  // Unauthenticated user visiting a protected route → send to login
  if (!user && !isPublicRoute) {
    console.log(`[middleware] unauthenticated, redirecting ${pathname} → /login`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public image files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
