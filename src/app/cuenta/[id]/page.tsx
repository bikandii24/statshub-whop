"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useWorkspace } from "@/context/workspace-context"
import type { SocialPlatform, RecentPost } from "@/context/workspace-context"
import { ArrowLeft, Users, Heart, Zap, LineChart, BadgeCheck, Eye, MessageCircle, Share2, Download, Play, Video, Film, Image } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"

// ── Platform config ───────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<SocialPlatform, { emoji: string; color: string; name: string }> = {
  tiktok:    { emoji: "🎵", color: "#EC4899", name: "TikTok" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : n.toString()

function timeAgo(ts: number) {
  if (!ts) return ''
  const days = Math.floor((Date.now() / 1000 - ts) / 86400)
  return days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`
}

function fmtDuration(secs: number): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Chart components ──────────────────────────────────────────────────────────
type MetricKey = "audiencia" | "engagement" | "alcance" | "vistas"
const METRIC_COLORS: Record<MetricKey, { stroke: string; gradId: string }> = {
  audiencia:  { stroke: "oklch(0.72 0.19 150)", gradId: "gradAudienciaAccount" },
  engagement: { stroke: "oklch(0.68 0.20 270)", gradId: "gradEngagementAccount" },
  alcance:    { stroke: "oklch(0.72 0.15 230)", gradId: "gradAlcanceAccount" },
  vistas:     { stroke: "oklch(0.70 0.18 340)", gradId: "gradVistasAccount" },
}
const METRIC_LABELS: Record<MetricKey, string> = {
  audiencia: "Total Audience", engagement: "Engagement", alcance: "Reach", vistas: "Views",
}

const CustomTooltip = ({ active, payload, label, isPercent }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  const fmtV = isPercent ? `${v}%` : v > 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString()
  return (
    <div className="glass border-white/10 rounded-2xl px-4 py-3 text-sm shadow-2xl">
      <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">{label}</p>
      <p className="font-black text-white">{fmtV}</p>
    </div>
  )
}

function MetricChart({ metric, data }: { metric: MetricKey; data: any[] }) {
  const cfg = METRIC_COLORS[metric]
  const isBar = metric === "engagement"
  const isPercent = metric === "engagement"
  const yFmt = (v: number) => isPercent ? `${v}%` : v > 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()
  return (
    <Card className="glass border-white/[0.07] overflow-hidden">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold" style={{ fontFamily: "var(--font-syne)" }}>
          {METRIC_LABELS[metric]}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[200px] pt-2 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          {isBar ? (
            <RechartsBarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs><linearGradient id={cfg.gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.stroke} stopOpacity={0.9} />
                <stop offset="100%" stopColor={cfg.stroke} stopOpacity={0.5} />
              </linearGradient></defs>
              <XAxis dataKey="name" stroke="oklch(0.62 0.025 258)" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.62 0.025 258)" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={yFmt} />
              <Tooltip content={<CustomTooltip isPercent={isPercent} />} />
              <Bar dataKey={metric} fill={`url(#${cfg.gradId})`} radius={[6, 6, 0, 0]} maxBarSize={28} />
            </RechartsBarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs><linearGradient id={cfg.gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cfg.stroke} stopOpacity={0.35} />
                <stop offset="95%" stopColor={cfg.stroke} stopOpacity={0} />
              </linearGradient></defs>
              <XAxis dataKey="name" stroke="oklch(0.62 0.025 258)" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.62 0.025 258)" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={yFmt} />
              <Tooltip content={<CustomTooltip isPercent={isPercent} />} />
              <Area type="monotone" dataKey={metric} stroke={cfg.stroke} strokeWidth={2.5} fillOpacity={1} fill={`url(#${cfg.gradId})`} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, platform, handle }: { post: RecentPost; platform: SocialPlatform; handle: string }) {
  const isShort   = post.type === "short"
  const isVertical = isShort || post.type === "reel"

  // Build URL fallback for TikTok
  const url = post.url ?? (
    platform === "tiktok" && post.id && !post.id.startsWith('post-')
      ? `https://www.tiktok.com/@${handle.replace(/^@/, '')}/video/${post.id}`
      : null
  )

  const platformLabel = isShort ? "▶ Short" : post.type === "reel" ? "◎ Reel" : post.type === "tweet" ? "𝕏 Tweet" : null

  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`glass border-white/[0.07] rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 block ${url ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={e => !url && e.preventDefault()}
    >
      {/* Thumbnail - vertical for Shorts/Reels, horizontal otherwise */}
      <div
        className="relative w-full bg-black/40 overflow-hidden"
        style={{ height: isVertical ? '200px' : '140px' }}
      >
        {post.thumbnail ? (
          <img
            src={post.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Play button */}
        {(post.type !== "post" && post.type !== "tweet" && post.type !== "photo") && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
              <Play className="size-5 text-white/70 ml-0.5" />
            </div>
          </div>
        )}
        {/* View count badge */}
        {post.views > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
            <Eye className="size-3 text-pink-400" />
            <span className="text-[11px] font-black text-white">{fmt(post.views)}</span>
          </div>
        )}
        {/* Date */}
        {post.createTime > 0 && (
          <div className="absolute top-2 right-2 text-[9px] font-black bg-black/70 backdrop-blur-sm text-white/80 rounded-lg px-2 py-1">
            {timeAgo(post.createTime)}
          </div>
        )}
        {/* Content type badge */}
        {platformLabel && (
          <div className="absolute top-2 left-2">
            <span className={`text-[9px] font-black rounded-lg px-2 py-1 ${
              isShort ? 'bg-red-500/80 text-white' : 'bg-pink-500/80 text-white'
            }`}>{platformLabel}</span>
          </div>
        )}
        {/* Duration for Shorts */}
        {post.duration && (
          <div className="absolute bottom-2 right-2 text-[9px] font-black bg-black/70 text-white/80 rounded-lg px-1.5 py-0.5">
            {fmtDuration(post.duration)}
          </div>
        )}
        {/* Watch link badge on hover */}
        {url && (
          <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[9px] font-black bg-white/20 backdrop-blur-sm text-white rounded-lg px-2 py-1">
              Open ↗
            </span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="px-4 py-3">
        {post.description && (
          <p className="text-[11px] text-muted-foreground/60 leading-snug mb-2 line-clamp-2">
            {post.description.replace(/#\w+/g, '').trim() || post.description.slice(0, 80)}
          </p>
        )}
        <div className="flex items-center gap-4 text-[11px] font-black">
          <span className="flex items-center gap-1.5 text-pink-400"><Heart className="size-3" /> {fmt(post.likes)}</span>
          {post.comments > 0 && <span className="flex items-center gap-1.5 text-blue-400"><MessageCircle className="size-3" /> {fmt(post.comments)}</span>}
          {post.shares > 0 && <span className="flex items-center gap-1.5 text-emerald-400"><Share2 className="size-3" /> {fmt(post.shares)}</span>}
        </div>
      </div>
    </a>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CuentaPage() {
  const params  = useParams()
  const router  = useRouter()
  const { accounts, snapshots } = useWorkspace()

  const idStr   = Array.isArray(params.id) ? params.id[0] : params.id
  const account = accounts.find(a => a.id === idStr)

  const platform = (account?.platform ?? "tiktok") as SocialPlatform
  const platformCfg = PLATFORM_CONFIG[platform]

  const [postFilter, setPostFilter] = React.useState<"all" | "short" | "video">("all")
  const [rpmRate, setRpmRate] = React.useState(0.5)
  const [sponsorRate, setSponsorRate] = React.useState(2.0)

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <p className="text-muted-foreground">Account not found.</p>
        <button onClick={() => router.back()} className="text-pink-400 font-bold">Go back</button>
      </div>
    )
  }

  const baseViews = account.views || 0
  const accountSnapshots = snapshots[account.id] || []

  const chartData = React.useMemo(() => {
    const followers = account.followers || 100
    const engagement = account.engagement || 1
    const views = baseViews || 0
    const byDay: Record<string, any> = {}
    accountSnapshots.forEach(snap => {
      const dayKey = format(new Date(snap.timestamp), 'dd MMM', { locale: enUS })
      if (!byDay[dayKey]) byDay[dayKey] = { name: dayKey, followers: [], engagements: [], views: [] }
      byDay[dayKey].followers.push(snap.followers || 0)
      byDay[dayKey].engagements.push(snap.engagement || 0)
      byDay[dayKey].views.push(snap.views || views || 0)
    })
    const grouped = Object.values(byDay).map(d => {
      const avgF = Math.round(d.followers.reduce((a: number, b: number) => a + b, 0) / d.followers.length)
      const avgE = +(d.engagements.reduce((a: number, b: number) => a + b, 0) / d.engagements.length).toFixed(1)
      const avgV = Math.round(d.views.reduce((a: number, b: number) => a + b, 0) / d.views.length)
      return { name: d.name, audiencia: avgF, engagement: avgE, vistas: avgV, alcance: Math.round(avgF * (avgE / 100) * 10) }
    })
    if (grouped.length >= 2) return grouped
    const steps = 7
    return Array.from({ length: steps }, (_, i) => {
      const daysAgo = steps - 1 - i
      const d = new Date(Date.now() - daysAgo * 86400000)
      const ratio = 0.80 + (i / (steps - 1)) * 0.20
      const noise = 1 + Math.sin(i * 2.3 + 1) * 0.04
      const r = ratio * noise
      const f = Math.round(followers * r)
      const e = +(engagement * r).toFixed(1)
      return { name: format(d, 'dd MMM', { locale: enUS }), audiencia: f, engagement: e, vistas: Math.round(views * r), alcance: Math.round(f * (e / 100) * 10) }
    })
  }, [accountSnapshots, account.followers, account.engagement, baseViews])

  // ── Post filtering ──
  const allPosts = account.recentPosts ?? []
  const visiblePosts = allPosts

  const monthlyFondo  = (baseViews / 1000) * rpmRate
  const sponsorPrice  = monthlyFondo * sponsorRate

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out max-w-5xl mx-auto">

      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-3" /> Back
      </button>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 glass border-white/[0.07] p-5 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px]"
          style={{ background: `${platformCfg.color}20` }} />

        {account.avatar ? (
          <img src={account.avatar} alt={account.handle} className="size-24 rounded-2xl object-cover shadow-xl" style={{ boxShadow: `0 20px 40px ${platformCfg.color}30` }} />
        ) : (
          <div className="size-24 rounded-2xl flex flex-col items-center justify-center text-4xl" style={{ background: `${platformCfg.color}20` }}>
            {platformCfg.emoji}
          </div>
        )}

        <div className="flex-1 min-w-0 text-center md:text-left z-10">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
              style={{ color: platformCfg.color, background: `${platformCfg.color}10`, borderColor: `${platformCfg.color}30` }}>
              {platformCfg.emoji} {platformCfg.name}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center justify-center md:justify-start gap-2 mb-2 break-all min-w-0" style={{ fontFamily: "var(--font-syne)" }}>
            <span className="min-w-0 break-all">{account.handle}</span>
            {account.verified && <BadgeCheck className="text-blue-400 size-5 sm:size-6 shrink-0" />}
          </h1>
          {account.bio && <p className="text-sm text-muted-foreground/60 mb-3 max-w-md">{account.bio}</p>}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Users className="size-4 text-emerald-400" /> <span className="font-bold text-white">{fmt(account.followers)}</span>
            </div>
            {account.likes > 0 && (
              <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                <Heart className="size-4 text-pink-400" /> <span className="font-bold text-white">{fmt(account.likes)}</span>
              </div>
            )}
            {account.engagement > 0 && (
              <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                <Zap className="size-4 text-violet-400" /> <span className="font-bold text-white">{account.engagement}% Eng.</span>
              </div>
            )}
            {account.posts > 0 && (
              <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                <Film className="size-4 text-amber-400" /> <span className="font-bold text-white">{fmt(account.posts)} posts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricChart metric="audiencia" data={chartData} />
        <MetricChart metric="vistas" data={chartData} />
        <MetricChart metric="engagement" data={chartData} />
        <MetricChart metric="alcance" data={chartData} />
      </div>

      {/* ── Posts Section ── */}
      {allPosts.length > 0 && (
        <div className="space-y-4">
          {/* Section header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-black text-white border-l-4 pl-4" style={{ borderColor: platformCfg.color, fontFamily: "var(--font-syne)" }}>
              Latest Videos · {allPosts.length}
            </h2>
          </div>

          {/* Posts grid */}
          <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`}>
            {visiblePosts.map(post => (
              <PostCard key={post.id} post={post} platform={platform} handle={account.handle} />
            ))}
          </div>
        </div>
      )}

      {/* ── ROI Calculator ── */}
      <div className="flex items-center justify-between mt-4 mb-4">
        <h2 className="text-2xl font-black text-white border-l-4 border-emerald-500 pl-4" style={{ fontFamily: "var(--font-syne)" }}>
          Account Dynamic ROI
        </h2>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-white transition-colors border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5"
        >
          <Download className="size-3" /> Export PDF
        </button>
      </div>
      <Card className="glass border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        <CardContent className="p-5 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Real Views · Last 30 days</p>
                <div className="text-4xl font-black text-white">{baseViews > 0 ? fmt(baseViews) : "—"} <span className="text-lg text-emerald-400">/ 30d</span></div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                    <LineChart className="size-3" /> Local RPM
                  </label>
                  <span className="text-lg font-black text-white">€{rpmRate.toFixed(2)}</span>
                </div>
                <input type="range" min="0.05" max="2.00" step="0.05" value={rpmRate}
                  onChange={e => setRpmRate(Number(e.target.value))} className="w-full accent-blue-500" />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Niche Multiplier</label>
                  <span className="text-lg font-black text-white">x{sponsorRate.toFixed(1)}</span>
                </div>
                <input type="range" min="1" max="10" step="0.5" value={sponsorRate}
                  onChange={e => setSponsorRate(Number(e.target.value))} className="w-full accent-violet-500" />
              </div>
            </div>
            <div className="space-y-4 flex flex-col justify-center">
              <div className="glass border-white/10 rounded-2xl p-5 bg-black/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Creator Fund (Monthly Est.)</p>
                <div className="text-3xl font-black text-white tracking-tighter mb-1">
                  €{monthlyFondo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-emerald-400/50">Passive organic revenue.</p>
              </div>
              <div className="glass border-white/10 rounded-2xl p-5 bg-violet-900/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Fair Sponsorship Rate (1 min)</p>
                <div className="text-4xl font-black text-white tracking-tighter mb-1">
                  €{sponsorPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-violet-400/50">Suggested price to charge brands.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
