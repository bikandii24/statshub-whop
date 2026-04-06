/**
 * Social Media API fetchers for Instagram, Twitter/X, YouTube, and Facebook.
 * All use the shared RAPIDAPI_KEY env var.
 * Each platform fetcher returns profile stats + recent posts/videos.
 */

import type { RecentPost } from '@/context/workspace-context'

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ''

// ── Helpers ───────────────────────────────────────────────────────────────────
async function rapidFetch(host: string, path: string, params: Record<string, string>) {
  const url = new URL(`https://${host}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-host': host,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 403) throw new Error(`API not subscribed. Go to rapidapi.com and subscribe to ${host} (free tier available).`)
    if (res.status === 429) throw new Error(`API rate limit reached (free tier: 100 req/month). Try again next month or upgrade the plan at rapidapi.com.`)
    throw new Error(`${host}${path} → HTTP ${res.status}: ${body.slice(0, 150)}`)
  }
  return res.json()
}

/** Parse ISO 8601 duration (PT1M30S) to seconds */
function iso8601ToSeconds(dur: string): number {
  const m = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? '0') * 3600) + (parseInt(m[2] ?? '0') * 60) + parseInt(m[3] ?? '0')
}

const fmtDate = () => new Date().toISOString()

// ── Profile result type ───────────────────────────────────────────────────────
interface ProfileData {
  handle: string
  followers: number
  following: number
  posts: number
  views: number
  avatar: string
  bio: string
  verified: boolean
  lastSync: string
  recentPosts: RecentPost[]
}
interface FetchResult {
  success: boolean
  error?: string
  data?: ProfileData
}

// ────────────────────────────────────────────────────────────────────────────
// INSTAGRAM — instagram-scraper-api-advanced.p.rapidapi.com (HookAPI)
// 2000 free req/month — GET /api/user/info/{username}  (path param, no query)
// Fields: data.followers, data.following, data.postsCount, data.profilePicture
// ────────────────────────────────────────────────────────────────────────────
export async function fetchInstagramStats(username: string): Promise<FetchResult> {
  const host  = 'instagram-scraper-api-advanced.p.rapidapi.com'
  const clean = username.replace(/^@/, '').trim()
  try {
    // 1. Profile — path parameter, 12s timeout to avoid hanging
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    let raw: any
    try {
      const res = await fetch(`https://${host}/api/user/info/${encodeURIComponent(clean)}`, {
        headers: {
          'x-rapidapi-host': host,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        if (res.status === 403) throw new Error(`API not subscribed. Subscribe to ${host} on rapidapi.com.`)
        if (res.status === 429) throw new Error(`Rate limit reached. Try again later.`)
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`)
      }
      raw = await res.json()
    } finally {
      clearTimeout(timer)
    }

    // Response: { success: true, data: { username, name, profilePicture, followers, following, postsCount, bio } }
    const d = raw?.data ?? raw
    if (!d?.username && !d?.name) {
      return { success: false, error: `Instagram: account @${clean} not found or private.` }
    }

    // 2. Posts (optional — not all plans include it)
    let recentPosts: RecentPost[] = []
    try {
      const postsRes = await fetch(`https://${host}/api/user/posts/${encodeURIComponent(clean)}`, {
        headers: { 'x-rapidapi-host': host, 'x-rapidapi-key': RAPIDAPI_KEY },
        cache: 'no-store',
      })
      if (postsRes.ok) {
        const postsRaw = await postsRes.json()
        const items: any[] = postsRaw?.data?.posts ?? postsRaw?.data ?? postsRaw?.posts ?? []
        recentPosts = items.slice(0, 50).map((p: any) => ({
          id: String(p.id ?? p.pk ?? Math.random()),
          description: (p.caption ?? p.text ?? '').slice(0, 120),
          thumbnail: p.thumbnailUrl ?? p.imageUrl ?? p.display_url ?? '',
          views: p.videoViews ?? p.video_view_count ?? p.viewCount ?? 0,
          likes: p.likes ?? p.likeCount ?? p.like_count ?? 0,
          comments: p.comments ?? p.commentCount ?? p.comment_count ?? 0,
          shares: 0,
          createTime: p.timestamp ?? p.taken_at ?? 0,
          url: p.url ?? (p.shortcode ? `https://www.instagram.com/p/${p.shortcode}/` : undefined),
          type: (p.type === 'video' || p.isVideo ? 'reel' : 'post') as RecentPost['type'],
        }))
      }
    } catch { /* posts optional */ }

    const followerCount = d.followers  ?? 0
    const postCount     = d.postsCount ?? 0
    const totalLikes    = recentPosts.reduce((s, p) => s + p.likes, 0)
    const engagement    = followerCount > 0 && recentPosts.length > 0
      ? parseFloat(((totalLikes / recentPosts.length / followerCount) * 100).toFixed(2))
      : 0

    return {
      success: true,
      data: {
        handle:    d.username ?? clean,
        followers: followerCount,
        following: d.following  ?? 0,
        posts:     postCount,
        views:     recentPosts.reduce((s, p) => s + p.views, 0),
        avatar:    d.profilePicture ?? d.profile_pic_url ?? '',
        bio:       d.bio ?? d.biography ?? '',
        verified:  d.isVerified ?? d.is_verified ?? false,
        lastSync:  fmtDate(),
        recentPosts,
      },
    }
  } catch (err: any) {
    const msg = err.name === 'AbortError' ? 'Instagram API timeout (12s). Instagram may be blocking scrapers.' : err.message
    return { success: false, error: `Instagram: ${msg}` }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TWITTER / X — twitter-api45.p.rapidapi.com
// ────────────────────────────────────────────────────────────────────────────
export async function fetchTwitterStats(username: string): Promise<FetchResult> {
  const host = 'twitter-api45.p.rapidapi.com'
  const clean = username.replace(/^@/, '')
  try {
    // 1. Profile
    const profile = await rapidFetch(host, '/screenname.php', { screenname: clean })
    // Profile check — just need the response to have some valid data
    if (!profile || typeof profile !== 'object') {
      return { success: false, error: 'Twitter/X: no data returned for this user.' }
    }

    // 2. Recent tweets (timeline)
    let recentPosts: RecentPost[] = []
    try {
      const timeline = await rapidFetch(host, '/timeline.php', { screenname: clean })
      const tweets: any[] =
        timeline?.timeline ??
        timeline?.tweets ??
        timeline?.data ??
        []
      recentPosts = tweets.slice(0, 50).map((t: any) => {
        const tweetId = t.tweet_id ?? t.id_str ?? t.id
        return {
          id: String(tweetId ?? Math.random()),
          description: (t.text ?? t.full_text ?? '').slice(0, 280),
          thumbnail: t.entities?.media?.[0]?.media_url_https ?? t.media_url ?? '',
          views: t.views ?? t.view_count ?? 0,
          likes: t.favorite_count ?? t.likes ?? 0,
          comments: t.reply_count ?? 0,
          shares: t.retweet_count ?? 0,
          createTime: t.created_at ? Math.floor(new Date(t.created_at).getTime() / 1000) : 0,
          url: tweetId ? `https://twitter.com/${clean}/status/${tweetId}` : undefined,
          type: 'tweet' as RecentPost['type'],
        }
      })
    } catch { /* timeline optional */ }

    const followers = profile.followers_count ?? profile.follower_count ?? profile.followers ?? 0
    const totalLikes = recentPosts.reduce((s, p) => s + p.likes, 0)
    const engagement = followers > 0 && recentPosts.length > 0
      ? parseFloat(((totalLikes / recentPosts.length / followers) * 100).toFixed(2))
      : 0

    return {
      success: true,
      data: {
        handle:    profile.screen_name ?? (typeof profile.profile === 'string' ? profile.profile : null) ?? clean,
        followers,
        following:  profile.friends_count   ?? profile.following_count ?? profile.following  ?? 0,
        posts:      profile.statuses_count  ?? profile.tweet_count     ?? profile.tweets     ?? 0,
        views:      recentPosts.reduce((s, p) => s + p.views, 0),
        avatar:     (profile.profile_image_url_https ?? profile.profile_image_url ?? '').replace('_normal', ''),
        bio:        profile.description ?? profile.bio ?? '',
        verified:   profile.blue_verified ?? profile.is_blue_verified ?? profile.verified ?? false,
        lastSync:   fmtDate(),
        recentPosts,
      },
    }
  } catch (err: any) {
    return { success: false, error: `Twitter/X: ${err.message ?? 'fetch failed'}` }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// YOUTUBE — youtube-v31.p.rapidapi.com
// Fetches channel profile + videos with Shorts detection (duration ≤ 60s)
// ────────────────────────────────────────────────────────────────────────────
export async function fetchYouTubeStats(handle: string): Promise<FetchResult> {
  const host = 'youtube-v31.p.rapidapi.com'
  const clean = handle.replace(/^@/, '')
  try {
    // 1. Channel info (profile + uploads playlist ID)
    const channelParams: Record<string, string> = {
      part: 'statistics,snippet,contentDetails',
      maxResults: '1',
    }
    if (clean.startsWith('UC') && clean.length > 20) {
      channelParams.id = clean
    } else {
      channelParams.forHandle = `@${clean}`
    }
    const channelJson = await rapidFetch(host, '/channels', channelParams)
    const channel = channelJson?.items?.[0]
    if (!channel) return { success: false, error: 'YouTube channel not found.' }

    const stats   = channel.statistics ?? {}
    const snippet = channel.snippet ?? {}
    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads

    // 2. Fetch recent videos from uploads playlist (up to 50)
    let recentPosts: RecentPost[] = []
    if (uploadsPlaylistId) {
      try {
        const playlistJson = await rapidFetch(host, '/playlistItems', {
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: '50',
        })
        const playlistItems: any[] = playlistJson?.items ?? []

        // Collect all video IDs
        const videoIds = playlistItems
          .map((item: any) => item.snippet?.resourceId?.videoId)
          .filter(Boolean)
          .join(',')

        // 3. Fetch video details (duration for Shorts detection + stats)
        let videoDetails: Record<string, any> = {}
        if (videoIds) {
          try {
            const videosJson = await rapidFetch(host, '/videos', {
              part: 'contentDetails,statistics',
              id: videoIds,
            })
            for (const v of videosJson?.items ?? []) {
              videoDetails[v.id] = v
            }
          } catch { /* ignore, will classify all as 'video' */ }
        }

        recentPosts = playlistItems.slice(0, 50).map((item: any) => {
          const s = item.snippet ?? {}
          const videoId = s.resourceId?.videoId
          const detail  = videoDetails[videoId] ?? {}
          const dur     = iso8601ToSeconds(detail.contentDetails?.duration ?? '')
          const isShort = dur > 0 && dur <= 60
          const ytViews = parseInt(detail.statistics?.viewCount ?? '0', 10)
          const ytLikes = parseInt(detail.statistics?.likeCount ?? '0', 10)

          return {
            id: videoId ?? String(Math.random()),
            description: (s.title ?? '').slice(0, 120),
            thumbnail: s.thumbnails?.high?.url ?? s.thumbnails?.default?.url ?? '',
            views: ytViews,
            likes: ytLikes,
            comments: parseInt(detail.statistics?.commentCount ?? '0', 10),
            shares: 0,
            createTime: s.publishedAt ? Math.floor(new Date(s.publishedAt).getTime() / 1000) : 0,
            url: videoId
              ? isShort
                ? `https://www.youtube.com/shorts/${videoId}`
                : `https://www.youtube.com/watch?v=${videoId}`
              : undefined,
            type: (isShort ? 'short' : 'video') as RecentPost['type'],
            duration: dur || undefined,
          }
        })
      } catch { /* playlist fetch optional */ }
    }

    const subscribers = parseInt(stats.subscriberCount ?? '0', 10)
    const totalViews  = recentPosts.reduce((s, p) => s + p.views, 0)
    const totalLikes  = recentPosts.reduce((s, p) => s + p.likes, 0)
    const engagement  = subscribers > 0 && recentPosts.length > 0
      ? parseFloat(((totalLikes / recentPosts.length / subscribers) * 100).toFixed(2))
      : 0

    return {
      success: true,
      data: {
        handle: snippet.customUrl ?? `@${clean}`,
        followers: subscribers,
        following: 0,
        posts: parseInt(stats.videoCount ?? '0', 10),
        views: totalViews || parseInt(stats.viewCount ?? '0', 10),
        avatar: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
        bio: (snippet.description ?? '').slice(0, 150),
        verified: false,
        lastSync: fmtDate(),
        recentPosts,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'YouTube fetch failed' }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// FACEBOOK — facebook-scraper-api4.p.rapidapi.com
// ────────────────────────────────────────────────────────────────────────────
export async function fetchFacebookStats(input: string): Promise<FetchResult> {
  const host = 'facebook-scraper-api4.p.rapidapi.com'
  const clean = input.replace(/^@/, '').trim()
  const fbUrl = clean.startsWith('http') ? clean : `https://www.facebook.com/${clean}`

  try {
    // 1. Page profile
    const pageJson = await rapidFetch(host, '/get_facebook_pages_details_from_link', {
      link: fbUrl,
      exact_followers_count: 'true',
      show_verified_badge: 'true',
      page_section: 'default',
    })
    // Facebook API returns an ARRAY of page objects — take first element
    const raw = Array.isArray(pageJson) ? pageJson[0] : (pageJson?.page ?? pageJson?.data ?? pageJson)
    const d = raw ?? {}
    const followers = d?.followers_count ?? d?.follower_count ?? d?.fan_count ?? d?.likes ?? 0

    if (!d || (!followers && !d?.name && !d?.page_name)) {
      return { success: false, error: 'Facebook: page not found or no data returned.' }
    }

    // 2. Recent page posts
    let recentPosts: RecentPost[] = []
    try {
      const postsJson = await rapidFetch(host, '/get_facebook_pages_posts_from_link', {
        link: fbUrl,
        count: '20',
      })
      const posts: any[] =
        postsJson?.posts ??
        postsJson?.data?.posts ??
        postsJson?.data ??
        []

      recentPosts = posts.slice(0, 20).map((p: any) => ({
        id: String(p.post_id ?? p.id ?? Math.random()),
        description: (p.text ?? p.message ?? p.story ?? '').slice(0, 200),
        thumbnail: p.image ?? p.images?.[0] ?? p.full_picture ?? '',
        views: p.shares?.count ?? 0,
        likes: p.likes_count ?? p.reactions?.count ?? p.like_count ?? 0,
        comments: p.comments_count ?? p.comment_count ?? 0,
        shares: p.shares_count ?? p.shares?.count ?? 0,
        createTime: p.timestamp ?? (p.time ? Math.floor(new Date(p.time).getTime() / 1000) : 0),
        url: p.post_url ?? p.url ?? undefined,
        type: 'post' as RecentPost['type'],
      }))
    } catch { /* posts endpoint optional */ }

    const slug = fbUrl.replace(/\/$/, '').split('/').pop() ?? clean
    const totalLikes = recentPosts.reduce((s, p) => s + p.likes, 0)
    const engagement = followers > 0 && recentPosts.length > 0
      ? parseFloat(((totalLikes / recentPosts.length / followers) * 100).toFixed(2))
      : 0

    return {
      success: true,
      data: {
        handle:    d.username ?? d.name ?? d.page_name ?? slug,
        followers: followers || (d.fan_count ?? d.likes ?? 0),
        following: 0,
        posts:     d.posts_count ?? 0,
        views:     0,
        avatar:    d.profile_picture ?? d.picture ?? d.cover?.source ?? d.logo ?? '',
        bio:       d.about ?? d.description ?? d.category ?? d.page_category ?? '',
        verified:  d.is_verified ?? d.verified ?? false,
        lastSync:  fmtDate(),
        recentPosts,
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Facebook fetch failed' }
  }
}
