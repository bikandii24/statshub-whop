// ── Whop SDK Integration (official pattern) ──
// Uses @whop/sdk verifyUserToken to authenticate users via x-whop-user-token header
// that Whop injects automatically when the app runs inside its iframe.

import { Whop } from "@whop/sdk"

let _whopsdk: Whop | null = null;
function getWhopSdk() {
  if (!_whopsdk) {
    try {
      _whopsdk = new Whop({
        appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
        apiKey: process.env.WHOP_API_KEY,
      })
    } catch (e) {
      // Ignore during build
    }
  }
  return _whopsdk;
}

// ── Helper: extract userId from headers ──
// In production, Whop sets x-whop-user-token on every iframe request.
// verifyUserToken decodes the JWT and returns { userId }.
export async function getWhopUser(headers: Headers) {
  try {
    const sdk = getWhopSdk();
    if (!sdk) return null;
    const { userId } = await sdk.verifyUserToken(headers)
    const user = await sdk.users.retrieve(userId)
    return {
      id: userId,
      name: user.name || `@${user.username}` || "User",
      email: `${user.username}@whop`,
      username: user.username || "",
      avatar: user.profile_picture?.url || "",
    }
  } catch {
    return null
  }
}

// ── Helper: get companyId from an experienceId ──
export async function getCompanyFromExperience(experienceId: string) {
  try {
    const sdk = getWhopSdk();
    if (!sdk) return null;
    const experience = await sdk.experiences.retrieve(experienceId)
    return experience.company.id ?? null
  } catch {
    return null
  }
}
