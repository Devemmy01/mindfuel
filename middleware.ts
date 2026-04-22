import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://apis.google.com https://www.gstatic.com https://www.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' blob: data: https:",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google-analytics.com https://analytics.google.com",
    "frame-src 'self' https://*.firebaseapp.com",
    "frame-ancestors 'none'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|logo.png|manifest.json).*)',
  ],
}