import { NextRequest, NextResponse } from "next/server"

// Whop App Store: authentication is handled by the x-whop-user-token header
// that Whop injects into all iframe requests. No custom auth middleware needed.
// Just pass requests through.

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static files
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  // Public mode: allow all access
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)"],
}
