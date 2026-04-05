import type { Config } from "@netlify/functions"

/**
 * Netlify Scheduled Function — runs every 24 hours at 6 AM UTC.
 * Calls the internal /api/sync-all endpoint to refresh all TikTok accounts.
 */
export default async function handler() {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL || "http://localhost:3000"
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error("[sync-cron] CRON_SECRET not set, aborting.")
    return
  }

  console.log(`[sync-cron] Starting scheduled sync at ${new Date().toISOString()}`)

  try {
    const res = await fetch(`${siteUrl}/api/sync-all`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": cronSecret,
      },
    })

    const data = await res.json()
    console.log(`[sync-cron] Result: ${data.synced} synced, ${data.failed} failed`)
    if (data.results?.length) {
      console.log(`[sync-cron] Details: ${data.results.join(", ")}`)
    }
  } catch (err) {
    console.error("[sync-cron] Failed:", err)
  }
}

export const config: Config = {
  schedule: "0 6 * * *",  // Every day at 6:00 AM UTC
}
