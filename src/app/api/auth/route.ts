// Auto-session for Whop version — no login required.
// Whop handles access control. Any visitor gets a session automatically.
// Cookies use sameSite:"none" so they work inside Whop's iframe.
import { NextRequest, NextResponse } from "next/server"
import { signToken } from "@/lib/auth"
import { randomBytes } from "crypto"

const isProd = process.env.NODE_ENV === "production"

// In iframe context, cookies need sameSite: "none" + secure: true
// In dev (localhost), we fall back to "lax" because browsers refuse
// sameSite:none without HTTPS
const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
  maxAge,
  path: "/",
})

export async function GET(req: NextRequest) {
  // If already has a valid session, just confirm it
  const existing = req.cookies.get("sh_token")?.value
  if (existing) {
    const { verifyToken } = await import("@/lib/auth")
    const user = verifyToken(existing)
    if (user) return NextResponse.json({ user })
  }

  // Also accept whop_bid as identity (set by /api/auth/whop-token)
  let browserId = req.cookies.get("whop_bid")?.value
  if (!browserId) browserId = randomBytes(12).toString("hex")

  const sessionUser = {
    id: `whop-${browserId}`,
    email: `user-${browserId.slice(0, 6)}@statshub.whop`,
    name: "Whop Member",
    authProvider: "whop" as const,
  }

  const token = signToken(sessionUser)
  const res = NextResponse.json({ user: sessionUser })

  res.cookies.set("whop_bid", browserId, cookieOptions(60 * 60 * 24 * 365))
  res.cookies.set("sh_token", token, cookieOptions(60 * 60 * 24 * 30))

  return res
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true })
    res.cookies.delete("sh_token")
    res.cookies.delete("whop_bid")
    return res
  }
  return NextResponse.json({ error: "Use Whop to manage your subscription." }, { status: 403 })
}
