import { NextRequest, NextResponse } from 'next/server'

// ── Sources (Spanish first, then English) ────────────────────────────────────
const SOURCES = [
  // 🇪🇸 Spanish sources (no translation needed)
  { url: 'https://www.xataka.com/feedburner.xml', name: 'Xataka', lang: 'es' },
  { url: 'https://www.genbeta.com/feedburner.xml', name: 'Genbeta', lang: 'es' },
  { url: 'https://marketing4ecommerce.net/feed/', name: 'Marketing4eCommerce', lang: 'es' },
  { url: 'https://www.elconfidencial.com/rss/tecnologia/', name: 'El Confidencial Tech', lang: 'es' },
  { url: 'https://feeds.weblogssl.com/xatakamovil', name: 'Xataka Móvil', lang: 'es' },
  // 🌐 English sources (will be translated)
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', lang: 'en' },
  { url: 'https://www.socialmediaexaminer.com/feed/', name: 'Social Media Examiner', lang: 'en' },
]

// ── Category keywords (Spanish & English) ─────────────────────────────────────
const CATEGORIES: Record<string, string[]> = {
  'Herramientas IA': ['ia ', 'inteligencia artificial', 'chatgpt', 'openai', 'gemini', 'claude', 'llm', 'gpt', 'machine learning', 'deepmind', 'copilot', 'midjourney', 'dall-e', 'generativa', 'neural', 'ai ', 'artificial intelligence'],
  'Redes Sociales':  ['tiktok', 'instagram', 'reels', 'creador', 'influencer', 'creator', 'youtube', 'shorts', 'viral', 'trend', 'tendencia'],
  'Negocios':        ['startup', 'inversión', 'financiación', 'revenue', 'ecommerce', 'marketing', 'marca', 'brand', 'business', 'funding'],
  'Tecnología':      ['apple', 'google', 'microsoft', 'android', 'iphone', 'smartphone', 'app', 'software', 'hardware', 'tech'],
}

function categorizarNoticia(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    if (keywords.some(kw => text.includes(kw))) return cat
  }
  return 'Tecnología'
}

// ── Free translation via MyMemory API (500 words/day free) ───────────────────
async function translateToSpanish(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 200))}&langpair=en|es`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return text
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    // MyMemory returns the original if it can't translate
    if (translated && translated !== text && !translated.toUpperCase().includes('MYMEMORY')) {
      return translated
    }
  } catch {
    // silently fallback to original
  }
  return text
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

  // Translate English titles/descriptions (batch, but limited to 15 to stay within free tier)
  const toTranslate = unique.filter(item => item.lang === 'en').slice(0, 15)
  await Promise.allSettled(
    toTranslate.map(async item => {
      item.title = await translateToSpanish(item.title)
      if (item.description) {
        item.description = await translateToSpanish(item.description.slice(0, 150))
      }
    })
  )

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
    return NextResponse.json({ news, cachedAt: cache?.at ?? Date.now() })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, news: [] }, { status: 500 })
  }
}
