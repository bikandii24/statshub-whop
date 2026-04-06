import { NextRequest, NextResponse } from 'next/server'
import { fetchTikTokStats } from '@/lib/tiktok'
import { verifyToken } from '@/lib/auth'
import { readDB, writeDB, readSettings } from '@/lib/storage'
import { checkRateLimit } from '@/lib/rate-limit'

// ── Auth from cookie (Whop version: accepts whop_bid as fallback) ─────────
function getUserFromRequest(req: NextRequest) {
  // Try JWT token first
  const token = req.cookies.get('sh_token')?.value
  if (token) {
    const user = verifyToken(token)
    if (user) return user
  }
  // Fallback: use whop_bid cookie (set by auto-session in /api/auth)
  const browserId = req.cookies.get('whop_bid')?.value
  if (browserId) {
    return {
      id: `whop-${browserId}`,
      email: `user-${browserId.slice(0, 6)}@statshub.whop`,
      name: 'Whop Member',
    }
  }
  return null
}

function getDefaultWorkspaces() {
  return [
    { id: 'ws-main', name: 'Mi Espacio', icon: 'Zap', color: 'text-violet-400' },
  ]
}

async function getUserData(userId: string) {
  const db = await readDB()
  let needsWrite = false
  if (!db.workspaces[userId]) { db.workspaces[userId] = getDefaultWorkspaces(); needsWrite = true }
  if (!db.accounts[userId])   { db.accounts[userId]   = []; needsWrite = true }
  if (needsWrite) await writeDB(db)
  return { db, workspaces: db.workspaces[userId], accounts: db.accounts[userId] }
}

// ── GET ──────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { db, workspaces, accounts } = await getUserData(user.id)

    // Check API key — env var first, then stored settings
    let apiConfigured = !!process.env.RAPIDAPI_KEY
    if (!apiConfigured) {
      try {
        const settings = await readSettings()
        apiConfigured = !!settings.RAPIDAPI_KEY
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      workspaces,
      accounts,
      snapshots: (db as any).snapshots ?? {},
      notifications: db.notifications?.[user.id] ?? [],
      apiConfigured
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 30 API calls/min per user
    const generalLimit = checkRateLimit(`accounts:${user.id}`, 30, 60 * 1000)
    if (!generalLimit.allowed) {
      return NextResponse.json({ error: 'Demasiadas peticiones. Espera un momento.' }, { status: 429 })
    }

    const { action, payload } = await req.json()
    const { db, workspaces, accounts } = await getUserData(user.id)

    if (action === 'add-account') {
      const platform = payload.platform ?? 'tiktok'

      // Always re-read fresh DB right before write to avoid stale data race
      const freshDB = await readDB()
      if (!freshDB.accounts[user.id]) freshDB.accounts[user.id] = []
      const freshAccounts = freshDB.accounts[user.id]

      // Deduplication: reject duplicate handles per platform
      const normalizedHandle = payload.handle.toLowerCase().replace(/^@/, '')
      const duplicate = freshAccounts.find((a: any) =>
        a.handle.toLowerCase().replace(/^@/, '') === normalizedHandle &&
        (a.platform ?? 'tiktok') === platform
      )
      if (duplicate) return NextResponse.json({ error: `Account ${payload.handle} is already linked (${platform}).` }, { status: 409 })

      // Max accounts limit per workspace
      const wsAccounts = freshAccounts.filter((a: any) => a.workspaceId === payload.workspaceId)
      if (wsAccounts.length >= 10) return NextResponse.json({ error: 'Max 10 accounts per workspace reached.' }, { status: 400 })

      let newAccount: any

      if (platform === 'tiktok') {
        // Rate limit TikTok scrapes: 5/hour per user (protects API credits)
        const scrapeLimit = checkRateLimit(`scrape:${user.id}`, 5, 60 * 60 * 1000)
        if (!scrapeLimit.allowed) {
          return NextResponse.json({ error: 'TikTok query limit reached. Wait 1 hour.' }, { status: 429 })
        }
        const result = await fetchTikTokStats(payload.handle)
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 422 })
        const stats = result.data!
        newAccount = {
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          handle: stats.handle,
          workspaceId: payload.workspaceId,
          platform: 'tiktok',
          followers: stats.followers,
          following: stats.following,
          likes: stats.likes,
          posts: stats.posts,
          views: stats.views,
          viewsIsReal: stats.viewsIsReal,
          engagement: stats.engagement,
          avatar: stats.avatar,
          bio: stats.bio,
          verified: stats.verified,
          lastSync: stats.lastSync,
          recentPosts: stats.recentPosts ?? [],
        }
      } else {
        // Non-TikTok: store manual data
        const md = payload.manualData ?? {}
        newAccount = {
          id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          handle: normalizedHandle,
          workspaceId: payload.workspaceId,
          platform,
          followers: md.followers ?? 0,
          following: 0,
          likes: 0,
          posts: md.posts ?? 0,
          views: md.views ?? 0,
          viewsIsReal: false,
          engagement: md.engagement ?? 0,
          avatar: '',
          bio: '',
          verified: false,
          lastSync: new Date().toISOString(),
          recentPosts: [],
        }
      }

      // Re-read AGAIN after any async op to get latest state
      const latestDB = await readDB()
      if (!latestDB.accounts[user.id]) latestDB.accounts[user.id] = []
      // Final dedup check
      const alreadyExists = latestDB.accounts[user.id].find((a: any) =>
        a.handle.toLowerCase().replace(/^@/, '') === normalizedHandle &&
        (a.platform ?? 'tiktok') === platform
      )
      if (alreadyExists) return NextResponse.json({ error: `Account ${payload.handle} already linked.` }, { status: 409 })
      latestDB.accounts[user.id].push(newAccount)
      latestDB.workspaces[user.id] = latestDB.workspaces[user.id] || freshDB.workspaces[user.id]
      await writeDB(latestDB)
      return NextResponse.json({ workspaces: latestDB.workspaces[user.id], accounts: latestDB.accounts[user.id], newAccount })
    }

    if (action === 'sync-account') {
      const account = accounts.find((a: any) => a.id === payload.id)
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      const result = await fetchTikTokStats(account.handle)
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 422 })
      Object.assign(account, {
        ...result.data!,
        recentPosts: result.data!.recentPosts ?? account.recentPosts ?? [],
      })
      db.accounts[user.id] = accounts
      // Save snapshot for history — includes views now
      if (!db.snapshots) (db as any).snapshots = {}
      if (!(db as any).snapshots[account.id]) (db as any).snapshots[account.id] = []
      const snaps = (db as any).snapshots[account.id]
      snaps.push({
        timestamp: new Date().toISOString(),
        followers: account.followers,
        engagement: account.engagement,
        likes: account.likes,
        posts: account.posts,
        views: account.views,  // ← now saved in every snapshot
      })
      // Keep only last 10 snapshots
      if (snaps.length > 10) snaps.splice(0, snaps.length - 10)
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts, snapshots: snaps })
    }


    if (action === 'add-workspace') {
      const newWs = { id: `ws-${Date.now()}`, name: payload.name, icon: payload.icon || 'Folder', color: payload.color || 'text-violet-400' }
      workspaces.push(newWs)
      db.workspaces[user.id] = workspaces
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts })
    }

    if (action === 'delete-account') {
      const filtered = accounts.filter((a: any) => a.id !== payload.id)
      db.accounts[user.id] = filtered
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts: filtered })
    }

    if (action === 'delete-workspace') {
      db.workspaces[user.id] = workspaces.filter((w: any) => w.id !== payload.id)
      db.accounts[user.id]   = accounts.filter((a: any) => a.workspaceId !== payload.id)
      await writeDB(db)
      return NextResponse.json({ workspaces: db.workspaces[user.id], accounts: db.accounts[user.id] })
    }

    if (action === 'rename-workspace') {
      const ws = workspaces.find((w: any) => w.id === payload.id)
      if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      if (!payload.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
      ws.name = payload.name.trim()
      db.workspaces[user.id] = workspaces
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
