import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  console.log(`[Middleware TRACE] Path: ${request.nextUrl.pathname}`);
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            })
          );
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  
  // Debug Logging
  console.log(`[Middleware] Path: ${request.nextUrl.pathname}`);
  console.log(`[Middleware] Cookies found: ${request.cookies.getAll().map(c => c.name).join(', ')}`);
  console.log(`[Middleware] User found: ${!!user}`);
  
  // Only log real errors, ignore "Auth session missing!" which is normal for anon users
  if (error && !error.message.includes('Auth session missing!')) {
    console.log(`[Middleware] Auth Error: ${error.message}`);
  }

  // Proteksi Route
  // Kecualikan /login dan /callback dari proteksi redirect
  const isAuthPath = request.nextUrl.pathname === '/callback' || request.nextUrl.pathname.startsWith('/auth');
  const isLoginPage = request.nextUrl.pathname === '/login';

  if (!user && !isLoginPage && !isAuthPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any file with an extension (e.g. .png, .jpg, .xlsx)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};