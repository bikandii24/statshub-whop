import { NextRequest, NextResponse } from "next/server"
import { getWhopUser } from "@/lib/whop"
import { readDB, writeDB } from "@/lib/storage"

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function mapUser(u: any) {
  // /user/info returns stats in both u directly AND in u.stats / u.userStats
  const followers =
    u.follower_count ?? u.followerCount ?? u.fans ??
    u.stats?.followerCount ?? u.userStats?.followerCount ?? 0
  const likes =
    u.total_favorited ?? u.heart ?? u.digg_count ??
    u.stats?.heartCount ?? u.userStats?.heartCount ?? 0
  const posts =
    u.aweme_count ?? u.videoCount ?? u.aweme ??
    u.stats?.videoCount ?? u.userStats?.videoCount ?? 0
  const avgLikes = posts > 0 ? likes / posts : 0
  const engagement = followers > 0 ? parseFloat(((avgLikes / followers) * 100).toFixed(2)) : 0
  return {
    id: u.uid ?? u.id ?? Math.random().toString(36),
    handle: `@${u.unique_id ?? u.uniqueId ?? u.username ?? "unknown"}`,
    name: u.nickname ?? u.name ?? u.unique_id ?? "Unknown",
    avatar: u.avatar_thumb?.url_list?.[0] ?? u.avatarThumb ?? u.avatar ?? "",
    verified: !!(u.custom_verify || u.verified || u.enterprise_verify_reason),
    followers,
    followersFormatted: fmt(followers),
    likes,
    posts,
    engagement,
    bio: u.signature ?? u.bio ?? "",
  }
}

// ── GET: search or return manual competitors ──────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getWhopUser(req.headers) ?? (process.env.NODE_ENV === 'development' ? { id: 'dev-local-user', email: 'dev@statshub.app', name: 'Dev User' } : null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get("keyword") ?? ""
  const workspaceId = searchParams.get("workspaceId") ?? ""

  // Always load manual competitors from DB
  const db = await readDB() as any
  if (!db.competitors) db.competitors = {}
  const manual: any[] = db.competitors[user.id] ?? []
  const workspaceManual = workspaceId
    ? manual.filter((c: any) => c.workspaceId === workspaceId)
    : manual

  const key = process.env.RAPIDAPI_KEY
  const host = process.env.RAPIDAPI_HOST ?? "tiktok-scraper7.p.rapidapi.com"

  if (!keyword) {
    return NextResponse.json({ competitors: workspaceManual, keyword: "", manual: true })
  }

  if (!key) {
    return NextResponse.json({
      competitors: workspaceManual,
      keyword,
      warning: "API not configured. Showing manual competitors only.",
    })
  }

  // Helper: merge user_info + stats (tiktok-scraper7 user/search format)
  function normaliseItem(item: any): any {
    const info  = item?.user_info ?? item
    const stats = item?.stats ?? {}
    return {
      ...info,
      // Overlay stats fields so mapUser can find them
      follower_count: info.follower_count ?? stats.follower_count ?? info.followerCount ?? stats.followerCount ?? 0,
      total_favorited: info.total_favorited ?? stats.digg_count ?? info.heart ?? stats.heartCount ?? 0,
      aweme_count: info.aweme_count ?? stats.aweme_count ?? info.videoCount ?? stats.videoCount ?? 0,
    }
  }

  try {
    let rawList: any[] = []

    // ── Strategy 1: /user/search ──────────────────────────────────────
    const searchRes = await fetch(
      `https://${host}/user/search?keyword=${encodeURIComponent(keyword)}&count=20&cursor=0`,
      { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host }, cache: "no-store", signal: AbortSignal.timeout(8000) }
    )
    if (searchRes.ok) {
      const json = await searchRes.json()
      const list: any[] =
        json?.data?.user_list ??
        json?.data?.userList ??
        json?.data?.users ??
        json?.user_list ??
        json?.userList ??
        json?.users ??
        json?.data?.items ??
        json?.items ?? []
      rawList = list.map(normaliseItem)
    }

    // ── Strategy 2: /hashtag/feed → extract unique creators ──────────
    if (rawList.length < 5) {
      const hashtagRes = await fetch(
        `https://${host}/hashtag/feed?name=${encodeURIComponent(keyword)}&count=30&cursor=0`,
        { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host }, cache: "no-store", signal: AbortSignal.timeout(8000) }
      )
      if (hashtagRes.ok) {
        const hjson = await hashtagRes.json()
        const videos: any[] =
          hjson?.data?.videos ?? hjson?.videos ??
          hjson?.data?.items ?? hjson?.items ?? []
        const seenUids = new Set<string>()
        for (const v of videos) {
          const author = v?.author ?? v?.authorMeta ?? null
          if (!author) continue
          const uid = String(author.uid ?? author.id ?? author.unique_id ?? "")
          if (!uid || seenUids.has(uid)) continue
          seenUids.add(uid)
          rawList.push({
            uid,
            unique_id: author.uniqueId ?? author.unique_id ?? author.id,
            nickname: author.nickname ?? author.name ?? author.uniqueId,
            avatar_thumb: { url_list: [author.avatarThumb ?? author.avatar ?? ""] },
            verified: author.verified ?? false,
            signature: author.signature ?? "",
            follower_count: author.fans ?? author.followerCount ?? 0,
            total_favorited: author.heart ?? 0,
            aweme_count: author.videoCount ?? 0,
          })
        }
      }
    }

    // ── Strategy 3: /video/search → extract unique creators ──────────
    if (rawList.length < 5) {
      const videoRes = await fetch(
        `https://${host}/video/search?keyword=${encodeURIComponent(keyword)}&count=20&cursor=0`,
        { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host }, cache: "no-store", signal: AbortSignal.timeout(8000) }
      )
      if (videoRes.ok) {
        const vjson = await videoRes.json()
        const videos: any[] =
          vjson?.data?.videos ?? vjson?.videos ??
          vjson?.data?.items ?? vjson?.items ?? []
        const seenUids = new Set<string>()
        for (const v of videos) {
          const author = v?.author ?? v?.authorMeta ?? null
          if (!author) continue
          const uid = String(author.uid ?? author.id ?? "")
          if (!uid || seenUids.has(uid)) continue
          seenUids.add(uid)
          rawList.push({
            uid,
            unique_id: author.uniqueId ?? author.unique_id ?? uid,
            nickname: author.nickname ?? author.name ?? uid,
            avatar_thumb: { url_list: [author.avatarThumb ?? ""] },
            verified: author.verified ?? false,
            signature: author.signature ?? "",
            follower_count: author.fans ?? author.followerCount ?? 0,
            total_favorited: author.heart ?? 0,
            aweme_count: author.videoCount ?? 0,
          })
        }
      }
    }

    if (!rawList.length) {
      return NextResponse.json({
        competitors: workspaceManual,
        keyword,
        warning: `No results for "${keyword}". ${workspaceManual.length > 0 ? "Showing manual competitors." : "Try another keyword or add competitors manually."}`,
      })
    }

    // Deduplicate and take top 5 by followers
    const seenHandles = new Set<string>()
    const found = rawList
      .map((item: any) => mapUser(item))
      .filter((c: any) => {
        const h = c.handle.toLowerCase()
        if (seenHandles.has(h)) return false
        seenHandles.add(h)
        return c.handle !== "@unknown"
      })
      .sort((a: any, b: any) => b.followers - a.followers)
      .slice(0, 5)

    // Merge: manual first, then search results (deduplicated)
    const manualHandles = new Set(workspaceManual.map((c: any) => c.handle.toLowerCase()))
    const merged = [
      ...workspaceManual,
      ...found.filter((c: any) => !manualHandles.has(c.handle.toLowerCase()))
    ]

    return NextResponse.json({ competitors: merged, keyword })

  } catch (err: any) {
    return NextResponse.json({
      competitors: workspaceManual,
      keyword,
      warning: "API connection error. Showing manual competitors only.",
      error: err.message,
    })
  }
}

// ── POST: add / delete manual competitor ─────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getWhopUser(req.headers) ?? (process.env.NODE_ENV === 'development' ? { id: 'dev-local-user', email: 'dev@statshub.app', name: 'Dev User' } : null)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, payload } = await req.json()
  const db = await readDB() as any
  if (!db.competitors) db.competitors = {}
  if (!db.competitors[user.id]) db.competitors[user.id] = []

  if (action === "add-manual") {
    const { handle, workspaceId } = payload
    if (!handle) return NextResponse.json({ error: "Handle required" }, { status: 400 })

    const normalized = handle.toLowerCase().replace(/^@/, "")
    const duplicate = db.competitors[user.id].find((c: any) =>
      c.handle.toLowerCase().replace(/^@/, "") === normalized
    )
    if (duplicate) return NextResponse.json({ error: "This competitor is already in your list." }, { status: 409 })

    // Try to fetch real TikTok stats for this handle
    const key = process.env.RAPIDAPI_KEY
    const host = process.env.RAPIDAPI_HOST ?? "tiktok-scraper7.p.rapidapi.com"
    let competitorData: any = {
      id: `manual-${Date.now()}`,
      handle: handle.startsWith("@") ? handle : `@${handle}`,
      name: handle.replace(/^@/, ""),
      avatar: "",
      verified: false,
      followers: 0,
      followersFormatted: "0",
      likes: 0,
      posts: 0,
      engagement: 0,
      bio: "",
      workspaceId,
      isManual: true,
    }

    if (key) {
      try {
        // ── 1. Fetch user info ── (same as tiktok.ts fetchTikTokStats)
        const infoRes = await fetch(
          `https://${host}/user/info?unique_id=${encodeURIComponent(normalized)}`,
          { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host }, cache: "no-store", signal: AbortSignal.timeout(10000) }
        )
        if (infoRes.ok) {
          const infoJson = await infoRes.json()
          if (infoJson?.code === 0) {
            // tiktok-scraper7: user profile + numeric stats are SEPARATE objects
            const u     = infoJson?.data?.user   // profile: uniqueId, nickname, avatarThumb, signature
            const stats = infoJson?.data?.stats  // counts: followerCount, heartCount, videoCount

            if (u && stats) {
              const followers  = stats.followerCount ?? 0
              const totalLikes = stats.heartCount ?? stats.heart ?? 0
              const totalPosts = stats.videoCount ?? 0
              const avgLikes   = totalLikes > 0 && totalPosts > 0 ? totalLikes / totalPosts : 0
              const engagement = followers > 0 ? parseFloat(((avgLikes / followers) * 100).toFixed(2)) : 0

              competitorData = {
                ...competitorData,
                id: u.id ?? competitorData.id,
                handle: `@${u.uniqueId ?? normalized}`,
                name: u.nickname ?? normalized,
                avatar: u.avatarThumb ?? u.avatarLarger ?? u.avatarMedium ?? "",
                verified: !!(u.verified || u.enterpriseVerifyReason),
                followers,
                followersFormatted: fmt(followers),
                likes: totalLikes,
                posts: totalPosts,
                engagement,
                bio: u.signature ?? "",
                workspaceId,
                isManual: true,
              }
            }
          }
        }

        // ── 2. Fetch TOP 5 most-viral videos via cursor pagination ──────────────
        // The API sorts by NEWEST first, so we need to paginate to find the most
        // viral videos of all time (not just the most recent 100).
        // We fetch up to MAX_PAGES pages (100 videos each) = up to 500 total,
        // collect all, sort by play_count, take top 5.
        const MAX_PAGES = 5
        const allVideos: any[] = []
        let cursor: string | number = 0
        let hasMore = true

        // Same getPlayCount helper as tiktok.ts
        const getPlayCount = (v: any): number =>
          v.play_count ?? v.playCount ?? v.play ??
          v.statistics?.play_count ?? v.stats?.play_count ??
          v.videoMeta?.playCount ?? 0

        for (let page = 0; page < MAX_PAGES && hasMore; page++) {
          try {
            const pageRes: Response = await fetch(
              `https://${host}/user/posts?unique_id=${encodeURIComponent(normalized)}&count=100&cursor=${cursor}`,
              { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host }, cache: "no-store", signal: AbortSignal.timeout(12000) }
            )
            if (!pageRes.ok) break
            const pageJson: any = await pageRes.json()

            const pageVideos: any[] =
              pageJson?.data?.videos ??
              pageJson?.data?.aweme_list ??
              pageJson?.data?.itemList ??
              []

            if (pageVideos.length === 0) break
            allVideos.push(...pageVideos)

            // Extract pagination cursor for next request
            const nextCursor: string | number | null =
              pageJson?.data?.cursor ??      // tiktok-scraper7 typical
              pageJson?.data?.max_cursor ??  // aweme_list style
              pageJson?.cursor ??
              null
            const more =
              pageJson?.data?.has_more ??
              pageJson?.data?.hasMore ??
              (nextCursor !== null && nextCursor !== cursor)

            if (!more || nextCursor === null || nextCursor === cursor) {
              hasMore = false
            } else {
              cursor = nextCursor
            }
          } catch { break }
        }

        if (allVideos.length > 0) {
          const topVideos = allVideos
            .map((v: any) => ({
              id: v.video_id ?? v.aweme_id ?? String(v.create_time ?? Math.random()),
              thumbnail: v.cover ?? v.origin_cover ?? v.dynamic_cover ??
                v.video?.cover?.url_list?.[0] ?? v.video?.origin_cover?.url_list?.[0] ?? "",
              description: (v.title ?? v.desc ?? v.description ?? "").slice(0, 120),
              views:    getPlayCount(v),
              likes:    v.digg_count   ?? v.statistics?.digg_count   ?? 0,
              comments: v.comment_count ?? v.statistics?.comment_count ?? 0,
              shares:   v.share_count  ?? v.statistics?.share_count  ?? 0,
              createTime: v.create_time ?? v.createTime ?? 0,
            }))
            .sort((a: any, b: any) => b.views - a.views)  // highest views first = most viral
            .slice(0, 5)

          competitorData.topVideos = topVideos
        }
      } catch {}
    }




    db.competitors[user.id].push(competitorData)
    await writeDB(db)
    return NextResponse.json({ competitor: competitorData, competitors: db.competitors[user.id] })
  }

  if (action === "delete-manual") {
    const { id } = payload
    db.competitors[user.id] = db.competitors[user.id].filter((c: any) => c.id !== id)
    await writeDB(db)
    return NextResponse.json({ competitors: db.competitors[user.id] })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
