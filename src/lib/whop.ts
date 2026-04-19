// ── Whop SDK Integration (official pattern) ──
// Uses @whop/sdk verifyUserToken to authenticate users via x-whop-user-token header
// that Whop injects automatically when the app runs inside its iframe.

import { Whop } from "@whop/sdk"

export const whopsdk = new Whop({
  appID: process.env.NEXT_PUBLIC_WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
})

// ── Helper: extract userId from headers ──
// In production, Whop sets x-whop-user-token on every iframe request.
// verifyUserToken decodes the JWT and returns { userId }.
export async function getWhopUser(headers: Headers) {
  try {
    const { userId } = await whopsdk.verifyUserToken(headers)
    const user = await whopsdk.users.retrieve(userId)
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
    const experience = await whopsdk.experiences.retrieve(experienceId)
    return experience.company.id ?? null
  } catch {
    return null
  }
}
