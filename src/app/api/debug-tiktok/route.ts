import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { readSettings } from '@/lib/storage'

export async function GET(req: NextRequest) {
  // Auth check
  const token = req.cookies.get('sh_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = verifyToken(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle') || 'gymotivation73'

  let apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    try {
      const settings = await readSettings()
      apiKey = settings.RAPIDAPI_KEY
    } catch { }
  }

  const apiHost = process.env.RAPIDAPI_HOST || 'tiktok-scraper7.p.rapidapi.com'
  const username = handle.replace(/^@/, '')

  const headers = { 'x-rapidapi-key': apiKey!, 'x-rapidapi-host': apiHost }

  const postsRes = await fetch(
    `https://${apiHost}/user/posts?unique_id=${encodeURIComponent(username)}&count=3`,
    { method: 'GET', headers, cache: 'no-store' }
  )

  const postsJson = await postsRes.json()

  // Return the raw response so we can see exact field names
  return NextResponse.json({
    status: postsRes.status,
    rawResponse: postsJson,
    firstVideoKeys: postsJson?.data?.videos?.[0]
      ? Object.keys(postsJson.data.videos[0])
      : postsJson?.data?.aweme_list?.[0]
        ? Object.keys(postsJson.data.aweme_list[0])
        : 'no videos found',
    firstVideo: postsJson?.data?.videos?.[0] ?? postsJson?.data?.aweme_list?.[0] ?? null,
  })
}
