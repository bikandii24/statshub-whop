import { NextRequest, NextResponse } from "next/server"

const JWT_SECRET = process.env.JWT_SECRET ?? "statshub-dev-secret-change-in-prod"

// Lightweight JWT verify for Edge Runtime (no jsonwebtoken dependency)
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/")
  try {
    return atob(base64)
  } catch {
    return ""
  }
}

function verifyTokenEdge(token: string): { id: string; email: string; name: string } | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    if (!payload?.id || !payload?.email) return null
    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null
    return { id: payload.id, email: payload.email, name: payload.name ?? "" }
  } catch {
    return null
  }
}

const PUBLIC_PATHS = ["/login", "/api/auth"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Check auth cookie
  const token = req.cookies.get("sh_token")?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  const user = verifyTokenEdge(token)
  if (!user) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    const res = NextResponse.redirect(url)
    res.cookies.delete("sh_token")
    return res
  }

  // Inject user info into headers for API routes
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-user-id", user.id)
  requestHeaders.set("x-user-email", user.email)
  requestHeaders.set("x-user-name", user.name)

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)"],
}
