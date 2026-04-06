import { NextRequest, NextResponse } from "next/server"

// Whop version: Whop controls access. No auth redirect needed.
// Just pass all requests through and inject user info if token exists.

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  try { return atob(base64) } catch { return "" }
}

function verifyTokenEdge(token: string): { id: string; email: string; name: string } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return { id: payload.id ?? "whop-anon", email: payload.email ?? "member@statshub.whop", name: payload.name ?? "Whop Member" }
  } catch { return null }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static files
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next()
  }

  // Try to inject user headers if token exists — but NEVER redirect to login
  const token = req.cookies.get("sh_token")?.value
  const bid    = req.cookies.get("whop_bid")?.value

  const user = token ? verifyTokenEdge(token) : null
  const userId = user?.id ?? (bid ? `whop-${bid}` : "whop-anon")
  const userEmail = user?.email ?? "member@statshub.whop"
  const userName = user?.name ?? "Whop Member"

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-user-id", userId)
  requestHeaders.set("x-user-email", userEmail)
  requestHeaders.set("x-user-name", userName)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)"],
}
