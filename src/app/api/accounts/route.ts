export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from 'next/server'
import { fetchTikTokStats } from '@/lib/tiktok'
import { getWhopUser } from '@/lib/whop'
import { readDB, writeDB, readSettings } from '@/lib/storage'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeHandle, isValidHandle, isValidPlatform, looksLikeAttack } from '@/lib/sanitize'

// ── Auth via Whop native token ─────────────────────────────────────────────
async function getUserFromRequest(req: NextRequest) {
  const user = await getWhopUser(req.headers)
  if (user) return user

  // Public mode: fallback to a guest user
  return {
    id: 'guest-user',
    email: 'guest@statshub.app',
    name: 'Guest',
  }
}

function getDefaultWorkspaces() {
  return [
    { id: 'ws-main', name: 'My Workspace', icon: 'Zap', color: 'text-violet-400' },
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
    const user = await getUserFromRequest(req)
    // Always provide a user (public mode)
    const userId = user?.id || 'guest-user'

    const { db, workspaces, accounts } = await getUserData(userId)

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
      notifications: db.notifications?.[userId] ?? [],
      apiConfigured
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    // Always provide a user (public mode)
    const userId = user?.id || 'guest-user'

    // Rate limit: 30 API calls/min per user
    const generalLimit = checkRateLimit(`accounts:${userId}`, 30, 60 * 1000)
    if (!generalLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
    }

    const { action, payload } = await req.json()
    const { db, workspaces, accounts } = await getUserData(userId)

    if (action === 'add-account') {
      const rawHandle   = String(payload.handle ?? '')
      const rawPlatform = String(payload.platform ?? 'tiktok')

      // ── Security guards ────────────────────────────────────────────────
      if (looksLikeAttack(rawHandle) || looksLikeAttack(rawPlatform)) {
        return NextResponse.json({ error: 'Invalid input.' }, { status: 400 })
      }
      if (!isValidPlatform(rawPlatform)) {
        return NextResponse.json({ error: 'Invalid platform.' }, { status: 400 })
      }
      const handle = sanitizeHandle(rawHandle)
      if (!handle || !isValidHandle(handle)) {
        return NextResponse.json({ error: 'Invalid handle format.' }, { status: 400 })
      }

      const platform = rawPlatform

      // Always re-read fresh DB right before write to avoid stale data race
      const freshDB = await readDB()
      if (!freshDB.accounts[userId]) freshDB.accounts[userId] = []
      const freshAccounts = freshDB.accounts[userId]

      // Deduplication: reject duplicate handles per platform
      const normalizedHandle = handle.toLowerCase().replace(/^@/, '')
      const duplicate = freshAccounts.find((a: any) =>
        a.handle.toLowerCase().replace(/^@/, '') === normalizedHandle &&
        (a.platform ?? 'tiktok') === platform
      )
      if (duplicate) return NextResponse.json({ error: `Account ${handle} is already linked (${platform}).` }, { status: 409 })

      // Max accounts limit per workspace
      const wsAccounts = freshAccounts.filter((a: any) => a.workspaceId === payload.workspaceId)
      if (wsAccounts.length >= 10) return NextResponse.json({ error: 'Max 10 accounts per workspace reached.' }, { status: 400 })

      if (platform !== 'tiktok') {
        return NextResponse.json({ error: 'Only TikTok is supported' }, { status: 400 })
      }
      
      // Rate limit TikTok scrapes: 5/hour per user (protects API credits)
      const scrapeLimit = checkRateLimit(`scrape:${userId}`, 5, 60 * 60 * 1000)
      if (!scrapeLimit.allowed) {
        return NextResponse.json({ error: 'TikTok query limit reached. Wait 1 hour.' }, { status: 429 })
      }
      const result = await fetchTikTokStats(payload.handle)
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 422 })
      const stats = result.data!
      const newAccount = {
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

      // Re-read AGAIN after any async op to get latest state
      const latestDB = await readDB()
      if (!latestDB.accounts[userId]) latestDB.accounts[userId] = []
      // Final dedup check
      const alreadyExists = latestDB.accounts[userId].find((a: any) =>
        a.handle.toLowerCase().replace(/^@/, '') === normalizedHandle &&
        (a.platform ?? 'tiktok') === platform
      )
      if (alreadyExists) return NextResponse.json({ error: `Account ${payload.handle} already linked.` }, { status: 409 })
      latestDB.accounts[userId].push(newAccount)
      latestDB.workspaces[userId] = latestDB.workspaces[userId] || freshDB.workspaces[userId]
      await writeDB(latestDB)
      return NextResponse.json({ workspaces: latestDB.workspaces[userId], accounts: latestDB.accounts[userId], newAccount })
    }

    if (action === 'sync-account') {
      const account = accounts.find((a: any) => a.id === payload.id)
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

      const platform = account.platform ?? 'tiktok'

      if (platform !== 'tiktok') {
        return NextResponse.json({ error: 'Only TikTok is supported' }, { status: 400 })
      }
      
      const result = await fetchTikTokStats(account.handle)
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 422 })
      Object.assign(account, {
        ...result.data!,
        recentPosts: result.data!.recentPosts ?? account.recentPosts ?? [],
        platform: 'tiktok',
      })
      db.accounts[userId] = accounts
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
      db.workspaces[userId] = workspaces
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts })
    }

    if (action === 'delete-account') {
      const filtered = accounts.filter((a: any) => a.id !== payload.id)
      db.accounts[userId] = filtered
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts: filtered })
    }

    if (action === 'delete-workspace') {
      db.workspaces[userId] = workspaces.filter((w: any) => w.id !== payload.id)
      db.accounts[userId]   = accounts.filter((a: any) => a.workspaceId !== payload.id)
      await writeDB(db)
      return NextResponse.json({ workspaces: db.workspaces[userId], accounts: db.accounts[userId] })
    }

    if (action === 'rename-workspace') {
      const ws = workspaces.find((w: any) => w.id === payload.id)
      if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      if (!payload.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
      ws.name = payload.name.trim()
      db.workspaces[userId] = workspaces
      await writeDB(db)
      return NextResponse.json({ workspaces, accounts })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
