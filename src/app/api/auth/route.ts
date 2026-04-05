// Auth route — Whop version
// Login/register via email/password is DISABLED.
// Authentication is handled exclusively by Whop OAuth (/api/auth/whop).
// This route only handles: session check (GET) and logout (POST action=logout).

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === "logout") {
      // Revoke Whop tokens if stored (best-effort)
      const whopRefreshToken = req.cookies.get("whop_refresh")?.value
      if (whopRefreshToken) {
        const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID
        if (clientId) {
          fetch("https://api.whop.com/oauth/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: whopRefreshToken, client_id: clientId }),
          }).catch(() => {})
        }
      }

      const res = NextResponse.json({ ok: true })
      res.cookies.delete("sh_token")
      res.cookies.delete("whop_refresh")
      res.cookies.delete("whop_pkce")
      return res
    }

    // Email/password login and registration are not available in this version.
    return NextResponse.json(
      { error: "Email/password auth is not available. Please sign in with Whop." },
      { status: 403 }
    )

  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  if (!token) return NextResponse.json({ user: null })
  const { verifyToken } = await import("@/lib/auth")
  const user = verifyToken(token)
  return NextResponse.json({ user })
}
