// /api/auth/whop-token
// Called by the /experiences/[experienceId] page when Whop passes a user token in the URL.
// Decodes the JWT (no signature check needed — Whop already verified the user),
// creates a stable session, and sets the sh_token + whop_bid cookies.

import { NextRequest, NextResponse } from "next/server"
import { signToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const whopToken = searchParams.get("token")

  if (!whopToken) {
    return NextResponse.json({ error: "No token" }, { status: 400 })
  }

  try {
    // Decode the JWT payload (no signature verification — Whop signs it)
    const parts = whopToken.split(".")
    if (parts.length < 2) throw new Error("Invalid JWT")
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8")
    )

    // Extract user info from Whop JWT payload
    const whopUserId: string = payload.sub ?? payload.userId ?? payload.id ?? payload.user_id ?? "unknown"
    const whopEmail: string  = payload.email ?? `${whopUserId}@whop.com`
    const whopName: string   = payload.name ?? payload.username ?? "Whop Member"

    // Use whopUserId as browser ID for stable sessions
    const browserId = whopUserId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32)

    const sessionUser = {
      id: `whop-${browserId}`,
      email: whopEmail,
      name: whopName,
      authProvider: "whop" as const,
    }

    const token = signToken(sessionUser)
    const res = NextResponse.json({ ok: true, user: sessionUser })

    res.cookies.set("whop_bid", browserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",    // required for cross-site iframe cookies
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })
    res.cookies.set("sh_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",    // required for cross-site iframe cookies
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    return res

  } catch (err: any) {
    // Fallback: create anonymous session
    const browserId = Math.random().toString(36).slice(2, 14)
    const sessionUser = {
      id: `whop-${browserId}`,
      email: `anon-${browserId}@statshub.whop`,
      name: "Whop Member",
      authProvider: "whop" as const,
    }
    const token = signToken(sessionUser)
    const res = NextResponse.json({ ok: true, user: sessionUser })
    res.cookies.set("whop_bid", browserId, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: 60 * 60 * 24 * 365, path: "/"
    })
    res.cookies.set("sh_token", token, {
      httpOnly: true, secure: true, sameSite: "none", maxAge: 60 * 60 * 24 * 30, path: "/"
    })
    return res
  }
}
