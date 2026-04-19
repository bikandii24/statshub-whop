import { NextRequest, NextResponse } from "next/server"

// Whop App Store: authentication via x-whop-user-token header
// This middleware ensures all protected routes have valid Whop access

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/experiences/") ||
    pathname === "/login" ||
    pathname === "/privacidad"
  ) {
    return NextResponse.next()
  }

  // Check for Whop user token in headers
  const whopToken = req.headers.get("x-whop-user-token")
  
  // In production, if no token and not on experience page, show access required
  // Note: Whop iframe automatically injects this header
  if (process.env.NODE_ENV === "production" && !whopToken) {
    // Check if we're in a Whop iframe context
    const referer = req.headers.get("referer") || ""
    const isWhopIframe = referer.includes("whop.com") || req.headers.get("x-whop-iframe") === "true"
    
    if (!isWhopIframe) {
      // Direct access attempt - redirect to access required page
      return NextResponse.rewrite(new URL("/access-required", req.url))
    }
  }

  // Add cache-busting headers for dynamic content
  const response = NextResponse.next()
  
  // Prevent caching of authenticated pages
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate")
  response.headers.set("Pragma", "no-cache")
  
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)"],
}
