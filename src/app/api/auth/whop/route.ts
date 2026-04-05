// /api/auth/whop — initiates the OAuth PKCE flow
// Stores code_verifier + state in an HttpOnly cookie, then redirects to Whop
import { NextResponse } from "next/server"
import { getWhopOAuthURL } from "@/lib/whop"

function randomBase64url(len: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return btoa(String.fromCharCode(...bytes))
    .replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!)
}

async function sha256Base64url(str: string): Promise<string> {
  const data = new TextEncoder().encode(str)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/[+/=]/g, (c) => ({ "+": "-", "/": "_", "=": "" })[c]!)
}

export async function GET() {
  const codeVerifier = randomBase64url(32)
  const state = randomBase64url(16)
  const codeChallenge = await sha256Base64url(codeVerifier)

  const authUrl = getWhopOAuthURL(state, codeChallenge)

  // Store PKCE state in a short-lived HttpOnly cookie
  const response = NextResponse.redirect(authUrl)
  const pkcePayload = JSON.stringify({ codeVerifier, state })
  response.cookies.set("whop_pkce", pkcePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  })

  return response
}
