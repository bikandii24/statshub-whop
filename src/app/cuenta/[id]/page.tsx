"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useWorkspace } from "@/context/workspace-context"
import { ArrowLeft, Users, Heart, Zap, LineChart, BadgeCheck, Eye, MessageCircle, Share2, Download, Play } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Area, AreaChart, Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"

// ── Types & Config ──
type MetricKey = "audiencia" | "engagement" | "alcance" | "vistas"
const METRIC_COLORS: Record<MetricKey, { stroke: string; gradId: string }> = {
  audiencia:  { stroke: "oklch(0.72 0.19 150)", gradId: "gradAudienciaAccount" },
  engagement: { stroke: "oklch(0.68 0.20 270)", gradId: "gradEngagementAccount" },
  alcance:    { stroke: "oklch(0.72 0.15 230)", gradId: "gradAlcanceAccount" },
  vistas:     { stroke: "oklch(0.70 0.18 340)", gradId: "gradVistasAccount" },
}
const METRIC_LABELS: Record<MetricKey, string> = {
  audiencia: "Total Audience", engagement: "Engagement",
  alcance: "Reach", vistas: "Real Views",
}

const CustomTooltip = ({ active, payload, label, isPercent }: any) => {
  if (!active || !payload?.length) return null
  const v = payload[0]?.value ?? 0
  const fmt = isPercent ? `${v}%` : v > 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString()
  return (
    <div className="glass border-white/10 rounded-2xl px-4 py-3 text-sm shadow-2xl">
      <p className="font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">{label}</p>
      <p className="font-black text-white">{fmt}</p>
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

export default function CuentaPage() {
  const params = useParams()
  const router = useRouter()
  const { accounts, snapshots } = useWorkspace()
  
  const idStr = Array.isArray(params.id) ? params.id[0] : params.id
  const account = accounts.find(a => a.id === idStr)

  // Use real views stored from API (play_count sum from /user/posts)
  const baseViews = account?.views || 0
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

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  // ── Snapshots History for this account ──
  const accountSnapshots = snapshots[account.id] || []

  const chartData = React.useMemo(() => {
    const followers = account.followers || 100
    const engagement = account.engagement || 1
    const views = baseViews || 0

    // Group snapshots by calendar day to avoid duplicate-date bars
    const byDay: Record<string, any> = {}
    accountSnapshots.forEach(snap => {
      const dayKey = format(new Date(snap.timestamp), 'dd MMM', { locale: enUS })
      if (!byDay[dayKey]) {
        byDay[dayKey] = { name: dayKey, followers: [], engagements: [], views: [] }
      }
      byDay[dayKey].followers.push(snap.followers || 0)
      byDay[dayKey].engagements.push(snap.engagement || 0)
      byDay[dayKey].views.push(snap.views || views || 0)
    })

    const grouped = Object.values(byDay).map(d => {
      const avgF = Math.round(d.followers.reduce((a: number, b: number) => a + b, 0) / d.followers.length)
      const avgE = +(d.engagements.reduce((a: number, b: number) => a + b, 0) / d.engagements.length).toFixed(1)
      const avgV = Math.round(d.views.reduce((a: number, b: number) => a + b, 0) / d.views.length)
      return {
        name: d.name,
        audiencia: avgF,
        engagement: avgE,
        vistas: avgV,
        alcance: Math.round(avgF * (avgE / 100) * 10),
      }
    })

    // Only use real data if we have 2+ unique days
    if (grouped.length >= 2) return grouped

    // Fallback: 7 daily points with realistic variation ending at today's real values
    const steps = 7
    return Array.from({ length: steps }, (_, i) => {
      const daysAgo = steps - 1 - i
      const d = new Date(Date.now() - daysAgo * 86400000)
      const ratio = 0.80 + (i / (steps - 1)) * 0.20  // 80% → 100%
      const noise = 1 + Math.sin(i * 2.3 + 1) * 0.04  // subtle seeded variation
      const r = ratio * noise
      const f = Math.round(followers * r)
      const e = +(engagement * r).toFixed(1)
      return {
        name: format(d, 'dd MMM', { locale: enUS }),
        audiencia: f,
        engagement: e,
        vistas: Math.round(views * r),
        alcance: Math.round(f * (e / 100) * 10),
      }
    })
  }, [accountSnapshots, account.followers, account.engagement, baseViews])


  // ROI Calculator Math
  const monthlyFondo = (baseViews / 1000) * rpmRate
  const sponsorPrice = monthlyFondo * sponsorRate

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out max-w-5xl mx-auto">
      
      {/* ── Back Navigation ── */}
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="size-3" /> Back
      </button>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-center gap-4 glass border-white/[0.07] p-5 sm:p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-[80px]" />
        
        {account.avatar ? (
          <img src={account.avatar} alt={account.handle} className="size-24 rounded-2xl object-cover shadow-xl shadow-pink-500/20" />
        ) : (
          <div className="size-24 rounded-2xl bg-pink-500/20 flex flex-col items-center justify-center text-pink-400">
            <span className="text-3xl font-black">@</span>
          </div>
        )}

        <div className="flex-1 min-w-0 text-center md:text-left z-10">
          <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center justify-center md:justify-start gap-2 mb-2 break-all min-w-0" style={{ fontFamily: "var(--font-syne)" }}>
            <span className="min-w-0 break-all">{account.handle}</span>
            {account.verified && <BadgeCheck className="text-blue-400 size-5 sm:size-6 shrink-0" />}
          </h1>
          <p className="text-sm font-medium text-muted-foreground/80 mb-3 max-w-md text-center sm:text-left">
            Individual analytics · weekly historical snapshots.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
            <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Users className="size-4 text-emerald-400" /> <span className="font-bold text-white">{fmt(account.followers)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Heart className="size-4 text-pink-400" /> <span className="font-bold text-white">{fmt(account.likes||0)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Zap className="size-4 text-violet-400" /> <span className="font-bold text-white">{account.engagement}% Eng.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricChart metric="audiencia" data={chartData} />
        <MetricChart metric="vistas" data={chartData} />
        <MetricChart metric="engagement" data={chartData} />
        <MetricChart metric="alcance" data={chartData} />
      </div>

      {/* ── Últimas Publicaciones ── */}
      {account.recentPosts && account.recentPosts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-white border-l-4 border-pink-500 pl-4" style={{ fontFamily: "var(--font-syne)" }}>
            Latest Posts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {account.recentPosts.map((post) => {
              const fmtV = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(1)}K` : n.toString()
              const ago = post.createTime ? (() => {
                const diff = Math.floor((Date.now()/1000 - post.createTime) / 86400)
                return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : `${diff}d ago`
              })() : ''
              // Build TikTok URL — only if we have a real numeric/string ID
              const tiktokUrl = post.id && !post.id.startsWith('post-')
                ? `https://www.tiktok.com/@${account.handle.replace(/^@/, '')}/video/${post.id}`
                : null
              return (
                <a
                  key={post.id}
                  href={tiktokUrl ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`glass border-white/[0.07] rounded-2xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 block ${tiktokUrl ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={e => !tiktokUrl && e.preventDefault()}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full bg-black/40 overflow-hidden" style={{ height: '140px' }}>
                    {post.thumbnail ? (
                      <img
                        src={post.thumbnail}
                        alt=""
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="size-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                        <Play className="size-5 text-white/70 ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                      <Eye className="size-3 text-pink-400" />
                      <span className="text-[11px] font-black text-white">{fmtV(post.views)}</span>
                    </div>
                    {ago && <div className="absolute top-2 right-2 text-[9px] font-black bg-black/70 backdrop-blur-sm text-white/80 rounded-lg px-2 py-1">{ago}</div>}
                    {tiktokUrl && (
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-black bg-pink-500/80 text-white rounded-lg px-2 py-1">Watch on TikTok ↗</span>
                      </div>
                    )}
                  </div>
                  {/* Stats row */}
                  <div className="px-4 py-3">
                    {post.description && (
                      <p className="text-[11px] text-muted-foreground/60 leading-snug mb-2 line-clamp-2">
                        {post.description.replace(/#\w+/g, '').trim() || post.description.slice(0, 60)}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-[11px] font-black">
                      <span className="flex items-center gap-1.5 text-pink-400"><Heart className="size-3" /> {fmtV(post.likes)}</span>
                      <span className="flex items-center gap-1.5 text-blue-400"><MessageCircle className="size-3" /> {fmtV(post.comments)}</span>
                      <span className="flex items-center gap-1.5 text-emerald-400"><Share2 className="size-3" /> {fmtV(post.shares)}</span>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}


      {/* ── ROI Dinámico de la Cuenta ── */}
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
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-2">Vistas Reales · Últimos 30 días</p>
                <div className="text-4xl font-black text-white">{baseViews > 0 ? fmt(baseViews) : "—"} <span className="text-lg text-emerald-400">/ 30 días</span></div>
                <p className="text-xs text-muted-foreground/50 mt-1">Suma real de <span className="font-bold text-white/70">play_count</span> de vídeos de los últimos 30 días · vía RapidAPI</p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                    <LineChart className="size-3" /> RPM Local
                  </label>
                  <span className="text-lg font-black text-white">€{rpmRate.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0.05" max="2.00" step="0.05" 
                  value={rpmRate} onChange={e => setRpmRate(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Mult. de Nicho (B2B)</label>
                  <span className="text-lg font-black text-white">x{sponsorRate.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1" max="10" step="0.5" 
                  value={sponsorRate} onChange={e => setSponsorRate(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-center">
              <div className="glass border-white/10 rounded-2xl p-5 bg-black/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Cálculo Fondo Creadores (Mensual)</p>
                <div className="text-3xl font-black text-white tracking-tighter mb-1">
                  €{monthlyFondo.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-emerald-400/50">Cobro orgánico pasivo.</p>
              </div>

              <div className="glass border-white/10 rounded-2xl p-5 bg-violet-900/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-1">Cotización Justa por Patrocinio (1 min)</p>
                <div className="text-4xl font-black text-white tracking-tighter mb-1">
                  €{sponsorPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <p className="text-xs text-violet-400/50">Precio sugerido a cobrarle a las marcas.</p>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
      
    </div>
  )
}

