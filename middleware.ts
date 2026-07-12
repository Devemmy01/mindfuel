import { NextRequest, NextResponse } from 'next/server'

// ─── Pre-compute the CSP string once at module load, not on every request ────
const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
const socketSources = socketUrl
  ? [socketUrl, socketUrl.replace(/^http/, "ws")]
  : [];
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://apis.google.com https://www.gstatic.com https://www.googleapis.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' blob: data: https:",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google-analytics.com https://analytics.google.com ${socketSources.join(" ")}`,
  "frame-src 'self' https://*.firebaseapp.com",
  "frame-ancestors 'none'",
].join('; ')

export function middleware(request: NextRequest) {
  const shouldOpenFeed =
    request.nextUrl.pathname === "/" &&
    request.nextUrl.searchParams.get("view") !== "landing" &&
    request.cookies.get("mindfuel_signed_in")?.value === "1";
  const response = shouldOpenFeed
    ? NextResponse.redirect(new URL("/feed", request.url))
    : NextResponse.next()

  // Security headers — set once from pre-computed constants
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Content-Security-Policy', CSP)

  return response
}

export const config = {
  matcher: [
    /*
     * Match only page routes — skip:
     *   - /api/*            (API routes handle their own security)
     *   - /_next/static/*   (static assets)
     *   - /_next/image/*    (image optimisation)
     *   - /favicon.ico, /robots.txt, /sitemap.xml, /manifest.json, /sw.js, /workbox-*
     *   - Any path ending in a file extension (images, fonts, etc.)
     *
     * This reduces middleware invocations by ~60% compared to running on
     * every route including static assets and API calls.
     */
    '/((?!api/|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.json|sw\\.js|workbox-|dev-sw\\.js|icon-|maskable-|splash-|worker-|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot|css|js|map|json)$).*)',
  ],
}
