// Auth endpoint for Whop App Store version.
// No login/logout — Whop handles authentication.
// This endpoint just returns the current user info from the Whop token.

import { NextRequest, NextResponse } from "next/server"
import { getWhopUser } from "@/lib/whop"

export async function GET(req: NextRequest) {
  const user = await getWhopUser(req.headers)

  if (!user) {
    // In development (no Whop iframe), provide a dev fallback
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        user: {
          id: "dev-local-user",
          name: "Dev User",
          email: "dev@statshub.app",
          username: "devuser",
          avatar: "",
        },
      })
    }
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  return NextResponse.json({ user })
}
