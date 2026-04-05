import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/**
 * Server-side image proxy — bypasses TikTok CDN referrer blocks.
 * Requires valid JWT session cookie (logged-in users only).
 */
export async function GET(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const token = req.cookies.get('sh_token')?.value
  if (!token || !verifyToken(token)) {
    return new NextResponse(null, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return new NextResponse(null, { status: 400 })
  }

  // Only proxy known TikTok CDN domains for security
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const allowedHosts = [
    'tiktokcdn.com',
    'tiktokcdn-us.com',
    'tiktok.com',
    'musical.ly',
    'tiktokv.com',
  ]
  const isAllowed = allowedHosts.some(h => parsedUrl.hostname.endsWith(h))
  if (!isAllowed) {
    return new NextResponse(null, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://www.tiktok.com/',
        'Origin': 'https://www.tiktok.com',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      // 8 second timeout
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const body = await res.arrayBuffer()

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400', // Cache 24h
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('[proxy-image] Failed to fetch:', url, err)
    return new NextResponse(null, { status: 502 })
  }
}
