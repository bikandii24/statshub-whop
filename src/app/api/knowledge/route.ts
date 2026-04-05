import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const KNOWLEDGE_PATH = process.env.KNOWLEDGE_PATH || path.join(process.cwd(), '..', 'knowledge')

interface Article {
  slug: string
  title: string
  category: string
  tags: string[]
  backlinks: string[]
  updatedAt: string
  wordCount: number
  content?: string
}

function parseMarkdownMeta(content: string, slug: string): Article {
  const lines = content.split('\n')
  const title = lines.find(l => l.startsWith('# '))?.replace('# ', '').trim() || slug
  const tagsMatch = content.match(/#[\w-]+/g) || []
  const tags = [...new Set(tagsMatch.filter(t => t !== '#'))]
  
  const backlinksMatch = content.match(/\[([^\]]+)\]\(\.\.?\/[^)]+\.md\)/g) || []
  const backlinks = backlinksMatch.map(b => b.match(/\[([^\]]+)\]/)?.[1] || '')

  const category = slug.split('/')[0] || 'general'
  const wordCount = content.split(/\s+/).length

  return { slug, title, category, tags, backlinks, wordCount, updatedAt: new Date().toISOString().split('T')[0] }
}

function getAllArticles(): Article[] {
  const wikiPath = path.join(KNOWLEDGE_PATH, 'wiki')
  if (!fs.existsSync(wikiPath)) return []

  const articles: Article[] = []

  function walk(dir: string, baseSlug: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${baseSlug}${entry.name}/`)
      } else if (entry.name.endsWith('.md')) {
        const filePath = path.join(dir, entry.name)
        const content = fs.readFileSync(filePath, 'utf-8')
        const slug = `${baseSlug}${entry.name.replace('.md', '')}`
        articles.push(parseMarkdownMeta(content, slug))
      }
    }
  }

  walk(wikiPath, '')
  return articles
}

function getArticle(slug: string): Article | null {
  const filePath = path.join(KNOWLEDGE_PATH, 'wiki', `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const content = fs.readFileSync(filePath, 'utf-8')
  const meta = parseMarkdownMeta(content, slug)
  return { ...meta, content }
}

function searchArticles(query: string): Article[] {
  const all = getAllArticles()
  const q = query.toLowerCase()
  const results: Article[] = []

  for (const article of all) {
    const filePath = path.join(KNOWLEDGE_PATH, 'wiki', `${article.slug}.md`)
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf-8').toLowerCase()
    if (content.includes(q) || article.title.toLowerCase().includes(q)) {
      results.push(article)
    }
  }
  return results
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')
  const search = searchParams.get('search')

  try {
    if (slug) {
      const article = getArticle(slug)
      if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ article })
    }

    if (search) {
      const results = searchArticles(search)
      return NextResponse.json({ articles: results, query: search })
    }

    const articles = getAllArticles()

    // Group by category
    const byCategory: Record<string, Article[]> = {}
    for (const a of articles) {
      if (!byCategory[a.category]) byCategory[a.category] = []
      byCategory[a.category].push(a)
    }

    return NextResponse.json({ articles, byCategory, total: articles.length })
  } catch (err) {
    console.error('[knowledge api]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
