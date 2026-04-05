// /api/auth/callback/whop — handles the OAuth callback from Whop
import { NextRequest, NextResponse } from "next/server"
import { exchangeWhopCode, getWhopUserInfo, checkWhopMembership } from "@/lib/whop"
import { signToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const returnedState = url.searchParams.get("state")
  const error = url.searchParams.get("error")

  const baseUrl = url.origin

  // ── Error from Whop ──────────────────────────────────────────
  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`)
  }

  if (!code || !returnedState) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_params`)
  }

  // ── Validate PKCE state from cookie ─────────────────────────
  const pkceCookie = req.cookies.get("whop_pkce")?.value
  if (!pkceCookie) {
    return NextResponse.redirect(`${baseUrl}/login?error=session_expired`)
  }

  let pkce: { codeVerifier: string; state: string }
  try {
    pkce = JSON.parse(pkceCookie)
  } catch {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_session`)
  }

  if (pkce.state !== returnedState) {
    return NextResponse.redirect(`${baseUrl}/login?error=state_mismatch`)
  }

  // ── Exchange code for tokens ─────────────────────────────────
  let tokens
  try {
    tokens = await exchangeWhopCode(code, pkce.codeVerifier)
  } catch (e: any) {
    console.error("[whop-callback] token exchange error:", e.message)
    return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`)
  }

  // ── Get user info from Whop ──────────────────────────────────
  let whopUser
  try {
    whopUser = await getWhopUserInfo(tokens.access_token)
  } catch (e: any) {
    console.error("[whop-callback] userinfo error:", e.message)
    return NextResponse.redirect(`${baseUrl}/login?error=userinfo_failed`)
  }

  // ── Check membership (only if WHOP_PRODUCT_ID is set) ────────
  const hasMembership = await checkWhopMembership(whopUser.sub)
  if (!hasMembership) {
    const productUrl = process.env.WHOP_PRODUCT_URL || "https://whop.com"
    return NextResponse.redirect(`${baseUrl}/login?error=no_membership&buy=${encodeURIComponent(productUrl)}`)
  }

  // ── Issue internal JWT session ────────────────────────────────
  // We reuse the existing JWT auth system so the rest of the app works unchanged.
  // The "user" is identified by their Whop user ID.
  const sessionUser = {
    id: whopUser.sub,
    email: whopUser.email || `${whopUser.preferred_username}@whop.user`,
    name: whopUser.name || whopUser.preferred_username || "Whop User",
    avatar: whopUser.picture,
    whopId: whopUser.sub,
    authProvider: "whop" as const,
  }

  const token = await signToken(sessionUser)

  // Clear the PKCE cookie, set auth session
  const response = NextResponse.redirect(`${baseUrl}/`)
  response.cookies.delete("whop_pkce")
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  })

  return response
}
