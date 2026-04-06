"use client"

import * as React from "react"
import { Search, Bookmark, ArrowUpRight, Clock, Globe, Newspaper, Dumbbell, Brain, DollarSign, Cpu, Flame, TrendingUp, Zap, RefreshCcw, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const CATEGORIES = ["All", "AI Tools", "Research", "Business", "Fitness"] as const
type Category = typeof CATEGORIES[number]

interface NewsItem {
  id: number
  title: string
  description: string
  url: string
  source: string
  image?: string
  category: Category | string
  pubDate: string
  ts: number
  hot: boolean
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case "AI Tools":   return { Icon: Cpu,       color: "text-blue-400",    bg: "bg-blue-500/10" }
    case "Research":   return { Icon: Brain,      color: "text-emerald-400", bg: "bg-emerald-500/10" }
    case "Fitness":    return { Icon: Dumbbell,   color: "text-orange-400",  bg: "bg-orange-500/10" }
    case "Business":   return { Icon: TrendingUp, color: "text-violet-400",  bg: "bg-violet-500/10" }
    default:           return { Icon: Globe,      color: "text-muted-foreground/60", bg: "bg-white/5" }
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NoticiasPage() {
  const [news, setNews] = React.useState<NewsItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [activeCategory, setActiveCategory] = React.useState<typeof CATEGORIES[number]>("All")
  const [saved, setSaved] = React.useState<Set<number>>(new Set())

  const fetchNews = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/news")
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setNews(data.news ?? [])
    } catch {
      setError("Could not load news. Check your connection.")
    } finally { setLoading(false) }
  }

  React.useEffect(() => { fetchNews() }, [])

  const toggleSave = (id: number) =>
    setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const filtered = news.filter(n => {
    const matchCat = activeCategory === "All" || n.category === activeCategory
    const matchQ = !query || n.title.toLowerCase().includes(query.toLowerCase()) || n.description.toLowerCase().includes(query.toLowerCase())
    return matchCat && matchQ
  })

  const hotCount   = news.filter(n => n.hot).length
  const sourcesSet = new Set(news.map(n => n.source))
  const todayCount = news.filter(n => Date.now() - n.ts < 86_400_000).length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="section-pill bg-orange-500/10 text-orange-400 border-orange-500/20 mb-3">
            <Flame className="size-3" /> News Feed
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Info <span className="gradient-text-orange">Radar</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">
            Real news on Tech, AI & business · updated every hour
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground/40 font-medium">{saved.size} saved</span>
          <Button onClick={fetchNews} variant="outline" className="glass border-white/10 h-10 px-4 rounded-full font-bold text-sm hover:bg-white/5 text-white/80 flex items-center gap-2">
            <RefreshCcw className="size-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Articles today",   value: todayCount.toString(),      icon: Newspaper,  color: "text-violet-400",  bg: "bg-violet-500/10" },
          { label: "Active sources",   value: sourcesSet.size.toString(), icon: Globe,      color: "text-blue-400",   bg: "bg-blue-500/10" },
          { label: "Total articles",   value: news.length.toString(),     icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Trending",         value: hotCount.toString(),         icon: Flame,      color: "text-orange-400",  bg: "bg-orange-500/10" },
        ].map(s => (
          <Card key={s.label} className="glass border-white/[0.07]">
            <CardContent className="p-4">
              <div className={`size-8 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-2`}><s.icon className="size-3.5" /></div>
              <div className="text-2xl font-black tracking-tighter text-white">{loading ? "—" : s.value}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
          <Input placeholder="Search news..." value={query} onChange={e => setQuery(e.target.value)} className="pl-11 h-11 glass border-white/[0.07] rounded-2xl font-medium" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${activeCategory === cat ? "bg-white/10 text-white border border-white/20" : "text-muted-foreground/60 hover:text-white/70 hover:bg-white/5 border border-transparent"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="size-10 animate-spin text-orange-400" />
          <p className="text-sm text-muted-foreground/60 font-medium">Loading real-world news...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div><p className="text-sm font-bold">Error loading news</p><p className="text-xs opacity-70 mt-0.5">{error}</p></div>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(item => {
            const { Icon, color, bg } = getCategoryIcon(item.category)
            const isSaved = saved.has(item.id)
            return (
              <Card key={item.id} className="glass border-white/[0.07] overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col">
                {item.image && (
                  <div className="h-36 overflow-hidden relative">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {item.hot && <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/90 text-white text-[9px] font-black uppercase tracking-widest"><Flame className="size-3" /> Hot</div>}
                  </div>
                )}
                <CardContent className="p-5 flex flex-col flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`size-6 rounded-lg ${bg} ${color} flex items-center justify-center`}><Icon className="size-3" /></div>
                      <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {item.hot && !item.image && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[8px] font-black uppercase px-1.5"><Flame className="size-2.5 mr-0.5" /> Hot</Badge>}
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground/40"><Clock className="size-2.5" />{timeAgo(item.ts)}</div>
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-white leading-snug line-clamp-3 flex-1" style={{ fontFamily: "var(--font-syne)" }}>{item.title}</h3>
                  <p className="text-xs text-muted-foreground/60 line-clamp-2 font-medium">{item.description || "No description available."}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/50"><Globe className="size-3" />{item.source}</div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSave(item.id)} className={`size-7 rounded-lg flex items-center justify-center transition-all ${isSaved ? "bg-violet-500/20 text-violet-400" : "hover:bg-white/5 text-muted-foreground/30 hover:text-white/50"}`}><Bookmark className="size-3.5" /></button>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="size-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-muted-foreground/50 hover:text-white transition-all" title="Open article"><ArrowUpRight className="size-3.5" /></a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && !loading && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
              <Newspaper className="size-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/50 font-medium">No news for this category or search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
