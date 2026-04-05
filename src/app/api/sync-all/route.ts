import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB, readSettings } from '@/lib/storage'
import { fetchTikTokStats } from '@/lib/tiktok'

/**
 * Internal endpoint called by the Netlify cron job every 24h.
 * Protected by CRON_SECRET env var (not user auth).
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = await readDB()
    const allUserIds = Object.keys(db.accounts || {})
    let synced = 0
    let failed = 0
    const results: string[] = []

    for (const userId of allUserIds) {
      const accounts: any[] = db.accounts[userId] || []

      for (const account of accounts) {
        try {
          const result = await fetchTikTokStats(account.handle)
          if (!result.success) {
            failed++
            results.push(`❌ ${account.handle}: ${result.error}`)
            continue
          }

          // Update account data
          const prev = { followers: account.followers, engagement: account.engagement }
          Object.assign(account, {
            ...result.data!,
            recentPosts: result.data!.recentPosts ?? account.recentPosts ?? [],
          })

          // Save snapshot
          if (!db.snapshots) (db as any).snapshots = {}
          if (!(db as any).snapshots[account.id]) (db as any).snapshots[account.id] = []
          const snaps = (db as any).snapshots[account.id]
          snaps.push({
            timestamp: new Date().toISOString(),
            followers: account.followers,
            engagement: account.engagement,
            likes: account.likes,
            posts: account.posts,
            views: account.views,
          })
          if (snaps.length > 30) snaps.splice(0, snaps.length - 30)

          // Detect significant changes (>10%) for notifications
          const followerChange = prev.followers > 0
            ? ((account.followers - prev.followers) / prev.followers) * 100
            : 0
          if (Math.abs(followerChange) >= 10) {
            if (!db.notifications) db.notifications = {}
            if (!db.notifications[userId]) db.notifications[userId] = []
            db.notifications[userId].push({
              id: `notif-${Date.now()}-${account.id}`,
              title: `${account.handle} ${followerChange > 0 ? '📈' : '📉'} ${followerChange > 0 ? '+' : ''}${followerChange.toFixed(1)}% en seguidores`,
              message: `Pasó de ${prev.followers} a ${account.followers} seguidores en las últimas 24h.`,
              type: followerChange > 0 ? 'success' : 'warning',
              read: false,
              timestamp: new Date().toISOString(),
            })
          }

          synced++
          results.push(`✅ ${account.handle}: ${account.followers} seguidores`)

          // Small delay between API calls to be nice to rate limits
          await new Promise(r => setTimeout(r, 2000))
        } catch (err: any) {
          failed++
          results.push(`❌ ${account.handle}: ${err.message}`)
        }
      }

      db.accounts[userId] = accounts
    }

    await writeDB(db)

    return NextResponse.json({
      ok: true,
      synced,
      failed,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
