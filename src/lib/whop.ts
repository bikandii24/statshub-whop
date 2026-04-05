// ── Whop Integration ── (cm-dashboard-whop only)
import Whop from "@whop/sdk"

// Server-side Whop client (company API key)
export function getWhopClient() {
  const apiKey = process.env.WHOP_API_KEY
  if (!apiKey) throw new Error("WHOP_API_KEY not set")
  return new Whop({ apiKey })
}

// ── OAuth helpers ──────────────────────────────────────────────
export const WHOP_OAUTH_BASE = "https://api.whop.com/oauth"

export function getWhopOAuthURL(state: string, codeChallenge: string): string {
  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID
  if (!clientId) throw new Error("NEXT_PUBLIC_WHOP_APP_ID not set")

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/callback/whop`

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })

  return `${WHOP_OAUTH_BASE}/authorize?${params.toString()}`
}

export async function exchangeWhopCode(code: string, codeVerifier: string): Promise<WhopTokens> {
  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID!
  const clientSecret = process.env.WHOP_CLIENT_SECRET!
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000"
  const redirectUri = `${baseUrl}/api/auth/callback/whop`

  const res = await fetch(`${WHOP_OAUTH_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: codeVerifier,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Whop token exchange failed: ${err.error_description || res.status}`)
  }

  const tokens = await res.json()
  return { ...tokens, obtained_at: Date.now() }
}

export async function getWhopUserInfo(accessToken: string): Promise<WhopUserInfo> {
  const res = await fetch(`${WHOP_OAUTH_BASE}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch Whop user info: ${res.status}`)
  return res.json()
}

// Check if the user has an active membership to this Whop product
export async function checkWhopMembership(whopUserId: string): Promise<boolean> {
  const productId = process.env.WHOP_PRODUCT_ID
  // If no product ID is configured, grant access to all authenticated Whop users
  if (!productId) return true

  try {
    const client = getWhopClient()
    const memberships = await client.memberships.list({
      user_ids: [whopUserId],
      product_ids: [productId],
    })
    // Filter for active memberships
    const active = memberships?.data?.filter((m: any) =>
      m.status === "active" || m.status === "trialing"
    ) ?? []
    return active.length > 0
  } catch {
    // If check fails, allow access (fail-open for now)
    return true
  }
}

export async function revokeWhopToken(refreshToken: string): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_WHOP_APP_ID!
  await fetch(`${WHOP_OAUTH_BASE}/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: refreshToken, client_id: clientId }),
  }).catch(() => {})
}

// ── Types ──────────────────────────────────────────────────────
export interface WhopTokens {
  access_token: string
  refresh_token: string
  id_token?: string
  token_type: string
  expires_in: number
  obtained_at: number
}

export interface WhopUserInfo {
  sub: string                  // whop user ID: "user_xxxxx"
  name?: string
  preferred_username?: string
  picture?: string
  email?: string
  email_verified?: boolean
}
