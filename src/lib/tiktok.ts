/**
 * TikTok Real Data Service
 * Uses RapidAPI tiktok-scraper7 — no official TikTok API needed.
 *
 * Requires .env.local:
 *   RAPIDAPI_KEY=your_key_here
 *   RAPIDAPI_HOST=tiktok-scraper7.p.rapidapi.com  (default)
 */

export interface RecentPost {
  id: string
  description: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  shares: number
  createTime: number  // Unix seconds
}

export interface TikTokStats {
  handle: string
  followers: number
  following: number
  likes: number
  posts: number
  views: number        // real sum of play_count from /user/posts (0 if unavailable)
  viewsIsReal: boolean // true = real API data, false = not available
  engagement: number
  avatar: string
  bio: string
  verified: boolean
  lastSync: string
  recentPosts: RecentPost[]
}

export interface TikTokFetchResult {
  success: boolean
  data?: TikTokStats
  error?: string
}

/**
 * Fetch real TikTok profile stats.
 * Makes two calls:
 *   1. /user/info  — followers, likes, posts, avatar, bio
 *   2. /user/posts — real play_count (views) for each video, summed
 */
export async function fetchTikTokStats(handle: string): Promise<TikTokFetchResult> {
  // ── API Key ──────────────────────────────────────────────────────────────
  let apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    try {
      const { readSettings } = await import("@/lib/storage")
      const settings = await readSettings()
      apiKey = settings.RAPIDAPI_KEY
    } catch { /* ignore */ }
  }

  const apiHost = process.env.RAPIDAPI_HOST || 'tiktok-scraper7.p.rapidapi.com'

  if (!apiKey) {
    return {
      success: false,
      error: 'RAPIDAPI_KEY no configurada. Añádela en las variables de entorno de Netlify.'
    }
  }

  const username = handle.replace(/^@/, '')
  const reqOpts = {
    method: 'GET' as const,
    headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost },
    cache: 'no-store' as const,
  }

  try {
    // ── 1. User info ──────────────────────────────────────────────────────
    const infoRes = await fetch(
      `https://${apiHost}/user/info?unique_id=${encodeURIComponent(username)}`,
      reqOpts
    )

    if (!infoRes.ok) {
      const text = await infoRes.text()
      return { success: false, error: `RapidAPI ${infoRes.status}: ${text.slice(0, 200)}` }
    }

    const infoJson = await infoRes.json()

    if (infoJson?.code !== 0) {
      return { success: false, error: `TikTok: ${infoJson?.msg ?? 'Error desconocido'}` }
    }

    const user  = infoJson?.data?.user
    const stats = infoJson?.data?.stats

    if (!user || !stats) {
      return { success: false, error: `Cuenta @${username} no encontrada.` }
    }

    const followers: number  = stats.followerCount ?? 0
    const following: number  = stats.followingCount ?? 0
    const totalLikes: number = stats.heartCount ?? stats.heart ?? 0
    const totalPosts: number = stats.videoCount ?? 0

    const avgLikesPerPost = totalLikes > 0 && totalPosts > 0 ? totalLikes / totalPosts : 0
    const engagement = followers > 0
      ? parseFloat(((avgLikesPerPost / followers) * 100).toFixed(2))
      : 0

    // ── 2. Real views from /user/posts (last 30 days) ────────────────────
    let totalViews = 0
    let viewsIsReal = false
    let recentPosts: RecentPost[] = []

    try {
      const postsRes = await fetch(
        `https://${apiHost}/user/posts?unique_id=${encodeURIComponent(username)}&count=50`,
        reqOpts
      )

      if (postsRes.ok) {
        const postsJson = await postsRes.json()

        // TIKWM / tiktok-scraper7 possible video list locations
        const videos: any[] =
          postsJson?.data?.videos ??
          postsJson?.data?.aweme_list ??
          postsJson?.data?.itemList ??
          []

        // Debug: log first video keys to see actual field names
        if (videos.length > 0) {
          console.log(`[TikTok] @${username} — first video keys:`, Object.keys(videos[0]).join(', '))
          console.log(`[TikTok] @${username} — first video sample:`, JSON.stringify(videos[0]).slice(0, 400))
        } else {
          console.log(`[TikTok] @${username} — posts response structure:`, JSON.stringify(postsJson).slice(0, 400))
        }

        if (videos.length > 0) {
          const cutoff = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
          const recent = videos.filter((v: any) => {
            const ts = v.create_time ?? v.createTime ?? v.aweme?.createTime ?? 0
            return ts === 0 || ts >= cutoff
          })

          const target = recent.length > 0 ? recent : videos

          // Extract play count — handle all known field name variants across TIKWM versions
          const getPlayCount = (v: any): number =>
            v.play_count ??
            v.playCount ??
            v.play ??
            v.statistics?.play_count ??
            v.stats?.play_count ??
            v.videoMeta?.playCount ??
            0

          const sum = target.reduce((acc: number, v: any) => acc + getPlayCount(v), 0)

          // Store last 3 recent posts for the account detail page
          const allSorted = [...videos].sort((a: any, b: any) =>
            (b.create_time ?? 0) - (a.create_time ?? 0)
          )
          recentPosts = allSorted.slice(0, 3).map((v: any) => ({
            id: v.video_id ?? v.aweme_id ?? String(v.create_time ?? Math.random()),
            description: (v.title ?? v.desc ?? v.description ?? '').slice(0, 120),
            thumbnail: v.cover ?? v.origin_cover ?? v.dynamic_cover ?? '',
            views: getPlayCount(v),
            likes: v.digg_count ?? v.statistics?.digg_count ?? 0,
            comments: v.comment_count ?? v.statistics?.comment_count ?? 0,
            shares: v.share_count ?? v.statistics?.share_count ?? 0,
            createTime: v.create_time ?? 0,
          }))

          if (sum > 0) {
            totalViews  = sum
            viewsIsReal = true
          } else {
            console.log(`[TikTok] @${username} — play_count was 0 for all ${target.length} videos`)
          }
        }
      } else {
        console.log(`[TikTok] @${username} — /user/posts failed: ${postsRes.status}`)
      }
    } catch (postsErr: any) {
      console.log(`[TikTok] @${username} — /user/posts error: ${postsErr.message}`)
    }

    return {
      success: true,
      data: {
        handle: `@${user.uniqueId ?? username}`,
        followers,
        following,
        likes: totalLikes,
        posts: totalPosts,
        views: totalViews,
        viewsIsReal,
        engagement,
        avatar: user.avatarThumb ?? user.avatarLarger ?? user.avatarMedium ?? '',
        bio: user.signature ?? '',
        verified: user.verified ?? false,
        lastSync: new Date().toISOString(),
        recentPosts,
      },
    }

  } catch (err: any) {
    return { success: false, error: `Error de red: ${err.message}` }
  }
}
