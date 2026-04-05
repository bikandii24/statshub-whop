// Auto-session for Whop version — no login required.
// Whop handles access control. Any visitor gets a session automatically.
import { NextRequest, NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import { randomBytes } from "crypto"

export async function GET(req: NextRequest) {
  // If already has a valid session, just confirm it
  const existing = req.cookies.get("sh_token")?.value
  if (existing) {
    const { verifyToken } = await import("@/lib/auth")
    const user = verifyToken(existing)
    if (user) return NextResponse.json({ user })
  }

  // Create a stable anonymous session from a browser ID cookie
  let browserId = req.cookies.get("whop_bid")?.value
  if (!browserId) browserId = randomBytes(12).toString("hex")

  const sessionUser = {
    id: `whop-${browserId}`,
    email: `user-${browserId.slice(0,6)}@statshub.whop`,
    name: "Whop Member",
    authProvider: "whop" as const,
  }

  const token = signToken(sessionUser)

  const res = NextResponse.json({ user: sessionUser })
  // Persist browser ID (1 year)
  res.cookies.set("whop_bid", browserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
  // Persist auth session (30 days)
  res.cookies.set("sh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return res
}

export async function POST(req: NextRequest) {
  // Only logout is allowed
  const body = await req.json().catch(() => ({}))
  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete("sh_token")
    res.cookies.delete("whop_bid")
    return res
  }
  return NextResponse.json({ error: "Use Whop to manage your subscription." }, { status: 403 })
}
