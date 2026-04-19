import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// ── Sources (English) ────────────────────────────────────
const SOURCES = [
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', lang: 'en' },
  { url: 'https://www.socialmediaexaminer.com/feed/', name: 'Social Media Examiner', lang: 'en' },
  { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', lang: 'en' },
  { url: 'https://mashable.com/feeds/rss/all', name: 'Mashable', lang: 'en' },
]

// ── Category keywords (English) ─────────────────────────────────────
const CATEGORIES: Record<string, string[]> = {
  'AI Tools': ['ai ', 'artificial intelligence', 'chatgpt', 'openai', 'gemini', 'claude', 'llm', 'gpt', 'machine learning', 'deepmind', 'copilot', 'midjourney', 'dall-e', 'generative', 'neural'],
  'Social Media':  ['tiktok', 'instagram', 'reels', 'creator', 'influencer', 'youtube', 'shorts', 'viral', 'trend'],
  'Business':        ['startup', 'investment', 'funding', 'revenue', 'ecommerce', 'marketing', 'brand', 'business'],
  'Technology':      ['apple', 'google', 'microsoft', 'android', 'iphone', 'smartphone', 'app', 'software', 'hardware', 'tech'],
}

function categorizarNoticia(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => text.includes(kw))) return cat
  }
  return 'Technology'
}

// ── XML parser ────────────────────────────────────────────────────────────────
function extractTag(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'))
  if (cdata) return cdata[1].trim()
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  if (plain) return plain[1].replace(/<[^>]+>/g, '').trim()
  return ''
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, 'i'))
  return m ? m[1] : ''
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#8230;/g, '…')
    .trim()
}

function parseRSS(xml: string, sourceName: string, lang: string): any[] {
  const results: any[] = []
  const itemsMatch = xml.match(/<item>([\s\S]*?)<\/item>/gi)
  const entriesMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/gi)
  const items = itemsMatch ?? entriesMatch ?? []

  for (const raw of items) {
    const title = stripHtml(extractTag(raw, 'title'))
    if (!title) continue

    let link = extractTag(raw, 'link').trim()
    if (!link || link.includes('<') || link.length < 10) {
      link = extractAttr(raw, 'link', 'href')
    }
    if (!link) {
      const guidM = raw.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i)
      link = guidM ? guidM[1].trim() : ''
    }
    if (!link || !link.startsWith('http')) continue

    const desc = stripHtml(
      extractTag(raw, 'description') || extractTag(raw, 'summary') || extractTag(raw, 'content')
    ).slice(0, 240)
    const pubDate = extractTag(raw, 'pubDate') || extractTag(raw, 'published') || extractTag(raw, 'updated')

    const image =
      extractAttr(raw, 'media:content', 'url') ||
      extractAttr(raw, 'media:thumbnail', 'url') ||
      extractAttr(raw, 'enclosure', 'url') || ''

    const ts = pubDate ? new Date(pubDate).getTime() : Date.now()
    if (Number.isNaN(ts)) continue

    results.push({ title, link, description: desc, source: sourceName, image, pubDate, ts, lang })
  }
  return results
}

// ── In-memory cache (1 hour) ──────────────────────────────────────────────────
let cache: { data: any[]; at: number } | null = null

async function fetchAllNews(): Promise<any[]> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.data

  const results = await Promise.allSettled(
    SOURCES.map(async ({ url, name, lang }) => {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' })
      if (!res.ok) return []
      const xml = await res.text()
      return parseRSS(xml, name, lang)
    })
  )

  const all: any[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

  // Sort, deduplicate
  let unique = all
    .sort((a, b) => b.ts - a.ts)
    .filter((item, i, arr) => arr.findIndex(x => x.title.slice(0, 40) === item.title.slice(0, 40)) === i)
    .slice(0, 50)

  const final = unique.slice(0, 40).map((item, i) => {
    return {
      id: i + 1,
      title: item.title,
      description: item.description,
      url: item.link,
      source: item.source,
      image: item.image,
      category: categorizarNoticia(item.title, item.description),
      pubDate: item.pubDate,
      ts: item.ts,
      hot: i < 3,
    }
  })

  cache = { data: final, at: Date.now() }
  return final
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const news = await fetchAllNews()
    return NextResponse.json(
      { news, cachedAt: cache?.at ?? Date.now() },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, news: [] },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}
