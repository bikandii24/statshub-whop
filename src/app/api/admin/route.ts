import { NextRequest, NextResponse } from 'next/server'
import { readDB, readUsers } from '@/lib/storage'

const ADMIN_KEY = process.env.ADMIN_KEY ?? ''

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const key = req.nextUrl.searchParams.get('key') ?? req.headers.get('x-admin-key') ?? ''
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Pull all data ─────────────────────────────────────────────────────────
  const [users, db] = await Promise.all([readUsers(), readDB()])

  // Build enriched user rows
  const rows = users.map((u: any) => {
    const accounts = (db.accounts[u.id] ?? []).map((a: any) => ({
      id:        a.id,
      handle:    a.handle,
      platform:  a.platform ?? 'tiktok',
      followers: a.followers ?? 0,
      posts:     a.posts ?? 0,
      views:     a.views ?? 0,
      engagement: a.engagement ?? 0,
      verified:  a.verified ?? false,
      lastSync:  a.lastSync,
      addedBy:   u.email ?? u.id,
    }))
    return {
      userId:    u.id,
      email:     u.email ?? '—',
      whopId:    u.whopId ?? '—',
      plan:      u.plan ?? '—',
      createdAt: u.createdAt ?? null,
      accountCount: accounts.length,
      accounts,
    }
  })

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const allAccounts = rows.flatMap((r: any) => r.accounts)
  const byPlatform = allAccounts.reduce((acc: any, a: any) => {
    acc[a.platform] = (acc[a.platform] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const stats = {
    totalUsers:    rows.length,
    totalAccounts: allAccounts.length,
    byPlatform,
    topByFollowers: [...allAccounts]
      .sort((a: any, b: any) => b.followers - a.followers)
      .slice(0, 20),
    recentlyAdded: [...allAccounts]
      .sort((a: any, b: any) => {
        const ta = a.lastSync ? new Date(a.lastSync).getTime() : 0
        const tb = b.lastSync ? new Date(b.lastSync).getTime() : 0
        return tb - ta
      })
      .slice(0, 20),
  }

  return NextResponse.json({ stats, users: rows, allAccounts })
}
