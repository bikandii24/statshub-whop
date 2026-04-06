/**
 * Social Media API fetchers for Instagram, Twitter/X, and YouTube
 * All use the shared RAPIDAPI_KEY env var.
 */

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ''

// ── Shared fetch helper ───────────────────────────────────────────────────────
async function rapidFetch(host: string, path: string, params: Record<string, string>) {
  const url = new URL(`https://${host}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-host': host,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
  })
  if (!res.ok) throw new Error(`${host} returned ${res.status}`)
  return res.json()
}

// ────────────────────────────────────────────────────────────────────────────
// INSTAGRAM — instagram-api-fast-reliable-data-scraper.p.rapidapi.com
// endpoint: GET /user_profile_data?username=xxx
// ────────────────────────────────────────────────────────────────────────────
export async function fetchInstagramStats(username: string): Promise<{
  success: boolean; error?: string; data?: {
    handle: string; followers: number; following: number; posts: number
    avatar: string; bio: string; verified: boolean; lastSync: string
  }
}> {
  try {
    const host = 'instagram-api-fast-reliable-data-scraper.p.rapidapi.com'
    const json = await rapidFetch(host, '/user_profile_data', { username: username.replace(/^@/, '') })

    // The API returns data nested in different ways — handle both
    const d = json?.data ?? json
    if (!d || (!d.follower_count && !d.followers_count)) {
      return { success: false, error: 'Instagram user not found or private.' }
    }

    return {
      success: true,
      data: {
        handle: d.username ?? username,
        followers: d.follower_count ?? d.followers_count ?? 0,
        following: d.following_count ?? d.followee_count ?? 0,
        posts: d.media_count ?? d.post_count ?? 0,
        avatar: d.profile_pic_url ?? d.profile_picture ?? '',
        bio: d.biography ?? d.bio ?? '',
        verified: d.is_verified ?? d.is_official_artist ?? false,
        lastSync: new Date().toISOString(),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Instagram fetch failed' }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TWITTER / X — twitter-api45.p.rapidapi.com
// endpoint: GET /screenname.php?screenname=xxx
// ────────────────────────────────────────────────────────────────────────────
export async function fetchTwitterStats(username: string): Promise<{
  success: boolean; error?: string; data?: {
    handle: string; followers: number; following: number; posts: number
    avatar: string; bio: string; verified: boolean; lastSync: string
  }
}> {
  try {
    const host = 'twitter-api45.p.rapidapi.com'
    const json = await rapidFetch(host, '/screenname.php', {
      screenname: username.replace(/^@/, ''),
    })

    if (!json || !json.followers_count) {
      return { success: false, error: 'Twitter/X user not found.' }
    }

    return {
      success: true,
      data: {
        handle: json.screen_name ?? username,
        followers: json.followers_count ?? 0,
        following: json.friends_count ?? 0,
        posts: json.statuses_count ?? 0,
        avatar: json.profile_image_url_https?.replace('_normal', '') ?? '',
        bio: json.description ?? '',
        verified: json.verified ?? json.is_blue_verified ?? false,
        lastSync: new Date().toISOString(),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'Twitter/X fetch failed' }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// YOUTUBE — youtube-v31.p.rapidapi.com
// endpoint: GET /channels?part=statistics,snippet&forHandle=@handle OR &id=UCxxxxxx
// ────────────────────────────────────────────────────────────────────────────
export async function fetchYouTubeStats(handle: string): Promise<{
  success: boolean; error?: string; data?: {
    handle: string; followers: number; following: number; posts: number
    views: number; avatar: string; bio: string; verified: boolean; lastSync: string
  }
}> {
  try {
    const host = 'youtube-v31.p.rapidapi.com'
    const cleanHandle = handle.replace(/^@/, '')

    // Try by @handle first, fall back to channel ID search
    const params: Record<string, string> = {
      part: 'statistics,snippet',
      maxResults: '1',
    }
    // If it looks like a channel ID (UCxxx...) use id, otherwise use forHandle
    if (cleanHandle.startsWith('UC') && cleanHandle.length > 20) {
      params.id = cleanHandle
    } else {
      params.forHandle = `@${cleanHandle}`
    }

    const json = await rapidFetch(host, '/channels', params)
    const item = json?.items?.[0]
    if (!item) {
      return { success: false, error: 'YouTube channel not found.' }
    }

    const stats = item.statistics ?? {}
    const snippet = item.snippet ?? {}

    return {
      success: true,
      data: {
        handle: snippet.customUrl ?? `@${cleanHandle}`,
        followers: parseInt(stats.subscriberCount ?? '0', 10),
        following: 0,
        posts: parseInt(stats.videoCount ?? '0', 10),
        views: parseInt(stats.viewCount ?? '0', 10),
        avatar: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.default?.url ?? '',
        bio: snippet.description?.slice(0, 150) ?? '',
        verified: false, // YouTube doesn't expose this in stats endpoint
        lastSync: new Date().toISOString(),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message ?? 'YouTube fetch failed' }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Facebook — no public scraper API available on RapidAPI (Meta blocked all)
// We keep it as manual for now.
// ────────────────────────────────────────────────────────────────────────────
export async function fetchFacebookStats(_username: string): Promise<{
  success: boolean; error?: string
}> {
  return {
    success: false,
    error: 'Facebook auto-sync not available. Meta blocks all third-party scrapers. Update manually.',
  }
}
