/**
 * Debug endpoint — dev/admin only.
 * Returns the RAW response from any social API so we can debug field names.
 * Usage: GET /api/debug-social?key=ADMIN_KEY&platform=instagram&handle=jaquebuee
 */
import { NextRequest, NextResponse } from 'next/server'

const ADMIN_KEY = process.env.ADMIN_KEY ?? ''

async function rawFetch(host: string, path: string, params: Record<string, string>) {
  const url = new URL(`https://${host}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: {
      'x-rapidapi-host': host,
      'x-rapidapi-key': process.env.RAPIDAPI_KEY ?? '',
    },
    cache: 'no-store',
  })
  const text = await res.text()
  return { status: res.status, ok: res.ok, url: url.toString().replace(process.env.RAPIDAPI_KEY ?? '', '***'), body: JSON.parse(text) }
}

export async function GET(req: NextRequest) {
  const key      = req.nextUrl.searchParams.get('key') ?? ''
  const platform = req.nextUrl.searchParams.get('platform') ?? ''
  const handle   = req.nextUrl.searchParams.get('handle') ?? ''

  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!platform || !handle) {
    return NextResponse.json({ error: 'Provide ?platform=instagram&handle=username' }, { status: 400 })
  }

  const clean = handle.replace(/^@/, '').trim()

  try {
    if (platform === 'instagram') {
      const profile = await rawFetch('instagram-api-fast-reliable-data-scraper.p.rapidapi.com', '/profile', { username: clean })
      let posts = null
      try { posts = await rawFetch('instagram-api-fast-reliable-data-scraper.p.rapidapi.com', '/user_posts', { username: clean, count: '3' }) } catch {}
      return NextResponse.json({ profile, posts })
    }

    if (platform === 'twitter') {
      const profile = await rawFetch('twitter-api45.p.rapidapi.com', '/screenname.php', { screenname: clean })
      let timeline = null
      try { timeline = await rawFetch('twitter-api45.p.rapidapi.com', '/timeline.php', { screenname: clean }) } catch {}
      return NextResponse.json({ profile, timeline })
    }

    if (platform === 'youtube') {
      const channel = await rawFetch('youtube-v31.p.rapidapi.com', '/channels', {
        part: 'statistics,snippet,contentDetails',
        maxResults: '1',
        forHandle: `@${clean}`,
      })
      return NextResponse.json({ channel })
    }

    if (platform === 'facebook') {
      const fbUrl = clean.startsWith('http') ? clean : `https://www.facebook.com/${clean}`
      const page = await rawFetch('facebook-scraper-api4.p.rapidapi.com', '/get_facebook_pages_details_from_link', {
        link: fbUrl, exact_followers_count: 'true',
      })
      return NextResponse.json({ page })
    }

    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
