"use client"


import { useT } from "@/i18n"
import * as React from "react"
import {
  BarChart3, Calendar as CalendarIcon, TrendingUp, Users, Eye, Flame, Video, Zap,
  RefreshCcw, MousePointerClick, Target, Clock, GitCompare, Download, Bell,
  BellRing, Trash2, Plus, AlertCircle, CheckCircle2, History,
} from "lucide-react"
import {
  Area, AreaChart, Bar, BarChart as RechartsBarChart, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Cell,
} from "recharts"
import { format } from "date-fns"
import { enUS } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useWorkspace } from "@/context/workspace-context"

// ── Types ─────────────────────────────────────────────────────────────────
type MetricKey = "audiencia" | "engagement" | "alcance" | "viralidad" | "vistas"
type TabId = "metricas" | "comparar" | "mejor-hora" | "objetivos" | "roi"

// ── Chart config ─────────────────────────────────────────────────────────
const METRIC_COLORS: Record<MetricKey, { stroke: string; gradId: string }> = {
  audiencia:  { stroke: "oklch(0.72 0.19 150)", gradId: "gradAudiencia" },
  engagement: { stroke: "oklch(0.68 0.20 270)", gradId: "gradEngagement" },
  alcance:    { stroke: "oklch(0.72 0.15 230)", gradId: "gradAlcance" },
  viralidad:  { stroke: "oklch(0.72 0.22 25)",  gradId: "gradViralidad" },
  vistas:     { stroke: "oklch(0.70 0.18 340)", gradId: "gradVistas" },
}
const METRIC_LABELS: Record<MetricKey, string> = {
  audiencia: "Total Audience", engagement: "Engagement Rate",
  alcance: "Estimated Reach", viralidad: "Virality Score",
  vistas: "Total Views",
}
const GOAL_TYPES = [
  { value: "followers", label: "Followers" },
  { value: "engagement", label: "Engagement (%)" },
  { value: "likes", label: "Likes" },
  { value: "posts", label: "Posts" },
]

// ── Custom Tooltip ────────────────────────────────────────────────────────
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

// ── MetricChart ──────────────────────────────────────────────────────────
function MetricChart({ metric, data, index }: { metric: MetricKey; data: any[]; index: number }) {
  const cfg = METRIC_COLORS[metric]
  const isBar = metric === "engagement"
  const isLine = metric === "viralidad"
  const isPercent = metric === "engagement" || metric === "viralidad"
  const yFmt = (v: number) => isPercent ? `${v}%` : v > 1000 ? `${(v / 1000).toFixed(0)}K` : v.toString()

  return (
    <Card className="glass border-white/[0.07] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold" style={{ fontFamily: "var(--font-syne)" }}>
              {METRIC_LABELS[metric]}
            </CardTitle>
            <CardDescription className="text-xs">Chart {index === 0 ? "A" : "B"}</CardDescription>
          </div>
          <Badge variant="outline" className="text-[9px] font-black uppercase px-2"
            style={{ borderColor: `${cfg.stroke}40`, color: cfg.stroke }}>
            {METRIC_LABELS[metric].split(" ")[0]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="h-[230px] pt-2 pr-2">
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
          ) : isLine ? (
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" stroke="oklch(0.62 0.025 258)" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.62 0.025 258)" fontSize={10} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={yFmt} />
              <Tooltip content={<CustomTooltip isPercent={isPercent} />} />
              <Line type="monotone" dataKey={metric} stroke={cfg.stroke} strokeWidth={2.5} dot={false} />
            </LineChart>
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

// ── CSV Export ──────────────────────────────────────────────────────────
function exportCSV(accounts: any[], workspaceName: string) {
  const headers = ["Account", "Followers", "Posts", "Likes", "Engagement (%)"]
  const rows = accounts.map(a => [a.handle, a.followers, a.posts, a.likes, a.engagement])
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${workspaceName}-${format(new Date(), "yyyy-MM-dd")}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Mejor hora data ───────────────────────────────────────────────────────
const HORAS_BASE = [
  { hora: "00h", v: 15 }, { hora: "01h", v: 8 }, { hora: "02h", v: 5 },
  { hora: "03h", v: 3 },  { hora: "04h", v: 2 }, { hora: "05h", v: 7 },
  { hora: "06h", v: 18 }, { hora: "07h", v: 28 }, { hora: "08h", v: 38 },
  { hora: "09h", v: 45 }, { hora: "10h", v: 42 }, { hora: "11h", v: 50 },
  { hora: "12h", v: 62 }, { hora: "13h", v: 58 }, { hora: "14h", v: 52 },
  { hora: "15h", v: 55 }, { hora: "16h", v: 60 }, { hora: "17h", v: 68 },
  { hora: "18h", v: 74 }, { hora: "19h", v: 82 }, { hora: "20h", v: 94 },
  { hora: "21h", v: 100 }, { hora: "22h", v: 88 }, { hora: "23h", v: 48 },
]

// ── Page ─────────────────────────────────────────────────────────────────
export default function AnaliticaPage() {
  const t = useT()
  const { activeWorkspace, accounts, snapshots, isLoading } = useWorkspace()
  const [activeTab, setActiveTab] = React.useState<TabId>("metricas")
  const [dateFilter, setDateFilter] = React.useState<"7d"|"30d"|"90d">("7d")

  // Interactive charts
  const [chartA, setChartA] = React.useState<MetricKey>("alcance")
  const [chartB, setChartB] = React.useState<MetricKey>("engagement")
  const [nextSlot, setNextSlot] = React.useState<"A" | "B">("A")

  // Account comparison
  const [cmpA, setCmpA] = React.useState("")
  const [cmpB, setCmpB] = React.useState("")

  // Goals
  const [goals, setGoals] = React.useState<any[]>([])
  const [newGoalAccount, setNewGoalAccount] = React.useState("")
  const [newGoalType, setNewGoalType] = React.useState("followers")
  const [newGoalTarget, setNewGoalTarget] = React.useState("")
  const [newGoalDeadline, setNewGoalDeadline] = React.useState("")
  const [savingGoal, setSavingGoal] = React.useState(false)

  // Workspace accounts
  const wsAccounts = accounts.filter(a => a.workspaceId === activeWorkspace?.id)

  // ROI State
  const [roiViews, setRoiViews] = React.useState(1000000)
  const [rpmRate, setRpmRate] = React.useState(0.5) // $0.50 per 1000 views
  const [sponsorRate, setSponsorRate] = React.useState(2) // 2x RPM for sponsorships

  // Metrics
  const totalFollowers = wsAccounts.reduce((s, a) => s + (a.followers || 0), 0)
  const totalPosts     = wsAccounts.reduce((s, a) => s + (a.posts || 0), 0)
  const totalLikes     = wsAccounts.reduce((s, a) => s + (a.likes || 0), 0)
  const totalViews     = wsAccounts.reduce((s, a) => s + (a.views || Math.round((a.likes||0)/0.03)), 0)
  const avgEngNum = wsAccounts.length > 0
    ? wsAccounts.reduce((s, a) => s + Number(a.engagement || 0), 0) / wsAccounts.length : 0
  const estimatedReach = Math.round(totalFollowers * (avgEngNum / 100) * 10)
  const viralScore = Math.min(100, Math.round(
    avgEngNum >= 9 ? 95 : avgEngNum >= 5 ? 75 + ((avgEngNum - 5) / 4) * 20 :
    avgEngNum >= 3 ? 55 + ((avgEngNum - 3) / 2) * 20 :
    avgEngNum >= 1 ? 30 + ((avgEngNum - 1) / 2) * 25 : avgEngNum * 30
  ))
  const fmtN = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : n.toString()

  const kpiList = [
    { title: t.analytics_kpi_audience,    value: fmtN(totalFollowers),    change: "Real followers",          up: null, icon: Users,      color: "text-emerald-400", bg: "bg-emerald-500/10", metricKey: "audiencia"  as MetricKey },
    { title: t.analytics_kpi_views,       value: fmtN(totalViews),        change: "Real views · last 35 vids", up: null, icon: Zap,        color: "text-pink-400",    bg: "bg-pink-500/10",    metricKey: "vistas"     as MetricKey },
    { title: t.analytics_kpi_engagement,   value: `${avgEngNum.toFixed(1)}%`, change: "Accounts average",     up: null, icon: TrendingUp, color: "text-violet-400",  bg: "bg-violet-500/10",  metricKey: "engagement" as MetricKey },
    { title: t.analytics_kpi_reach,   value: fmtN(estimatedReach),    change: "Reach × engagement",     up: null, icon: Eye,        color: "text-blue-400",   bg: "bg-blue-500/10",   metricKey: "alcance"    as MetricKey },
  ]

  // Real chart data from snapshots
  const chartData = React.useMemo(() => {
    const filterDays = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - filterDays)

    const dailyData: Record<string, any> = {}
    
    // Flatten snapshots for wsAccounts
    wsAccounts.forEach(acc => {
      const accSnaps = snapshots[acc.id] || []
      accSnaps.forEach(snap => {
        const d = new Date(snap.timestamp)
        if (d >= cutoff) {
          const day = format(d, 'MMM dd', { locale: enUS })
          if (!dailyData[day]) {
            dailyData[day] = { name: day, audiencias: [], likes: [], posts: [], engagements: [] }
          }
          dailyData[day].audiencias.push(snap.followers || 0)
          dailyData[day].likes.push(snap.likes || 0)
          dailyData[day].posts.push(snap.posts || 0)
          dailyData[day].engagements.push(snap.engagement || 0)
        }
      })
    })

    const result = Object.values(dailyData).map(d => {
      const totalAudiencia = d.audiencias.reduce((a:number,b:number)=>a+b, 0)
      const totalLik = d.likes.reduce((a:number,b:number)=>a+b, 0)
      const avgEng = d.engagements.length ? d.engagements.reduce((a:number,b:number)=>a+b, 0) / d.engagements.length : 0
      const calcAlcance = Math.round(totalAudiencia * (avgEng / 100) * 10)
      const viral = Math.min(100, Math.round(avgEng * 5))
      return {
        name: d.name,
        audiencia: totalAudiencia,
        engagement: +avgEng.toFixed(1),
        alcance: calcAlcance,
        viralidad: viral,
        vistas: Math.round(totalLik / 0.03)
      }
    })

    // Fallback: generate realistic labelled points scaled to the filter period
    if (result.length < 2) {
      const bf = totalFollowers || 100
      const be = avgEngNum || 1
      const bv = viralScore || 10
      const vl = totalViews || 5000

      const stepConfig = dateFilter === "7d"
        ? { steps: 7, labelFn: (i: number) => format(new Date(Date.now() - (6-i)*86400000), 'dd MMM', { locale: enUS }), variation: 0.04 }
        : dateFilter === "30d"
        ? { steps: 5, labelFn: (i: number) => format(new Date(Date.now() - (4-i)*7*86400000), "'Wk' dd MMM", { locale: enUS }), variation: 0.08 }
        : { steps: 6, labelFn: (i: number) => format(new Date(Date.now() - (5-i)*15*86400000), 'dd MMM', { locale: enUS }), variation: 0.15 }

      return Array.from({ length: stepConfig.steps }, (_, i) => {
        const ratio = 0.8 + (i / (stepConfig.steps - 1)) * 0.2  // grows from 80% to 100%
        const noise = 1 + (Math.sin(i * 2.3 + 1) * stepConfig.variation)  // seeded noise
        const r = ratio * noise
        const eng = be * r
        const aud = Math.round(bf * r)
        return {
          name: stepConfig.labelFn(i),
          audiencia: aud,
          engagement: +eng.toFixed(1),
          alcance: Math.round(aud * (eng / 100) * 10),
          viralidad: Math.min(100, +(bv * r).toFixed(1)),
          vistas: Math.round(vl * r),
        }
      })
    }

    return result
  }, [wsAccounts, snapshots, dateFilter, totalFollowers, avgEngNum, estimatedReach, viralScore, totalViews])

  const horasData = HORAS_BASE.map(h => ({ ...h, engagement: Math.round(h.v * (avgEngNum || 5) / 50 * 10) / 10 || h.v }))
  const bestHour = horasData.reduce((a, b) => b.v > a.v ? b : a)

  // Goals
  React.useEffect(() => {
    fetch("/api/goals").then(r => r.ok ? r.json() : null).then(d => { if (d) setGoals(d.goals ?? []) })
  }, [])

  const handleAddGoal = async () => {
    if (!newGoalTarget || !newGoalAccount) return
    setSavingGoal(true)
    const acc = wsAccounts.find(a => a.id === newGoalAccount)
    const res = await fetch("/api/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-goal", payload: {
        accountId: newGoalAccount, handle: acc?.handle ?? "",
        workspaceId: activeWorkspace?.id, type: newGoalType,
        target: newGoalTarget, deadline: newGoalDeadline || null,
      }}),
    })
    const data = await res.json()
    if (res.ok) { setGoals(data.goals); setNewGoalTarget(""); setNewGoalDeadline("") }
    setSavingGoal(false)
  }

  const handleDeleteGoal = async (id: string) => {
    const res = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-goal", payload: { id } }) })
    const data = await res.json()
    if (res.ok) setGoals(data.goals)
  }

  const getProgress = (goal: any) => {
    const acc = wsAccounts.find(a => a.id === goal.accountId)
    if (!acc) return { current: 0, pct: 0 }
    const valMap: Record<string, number> = {
      followers:  Number(acc.followers  ?? 0),
      engagement: Number(acc.engagement ?? 0),
      likes:      Number(acc.likes      ?? 0),
      posts:      Number(acc.posts      ?? 0),
    }
    const current = valMap[goal.type] ?? 0
    return { current, pct: Math.min(100, Math.round((current / goal.target) * 100)) }
  }

  const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: "metricas",    label: t.analytics_tab_metrics,       icon: BarChart3 },
    { id: "comparar",   label: t.analytics_tab_compare,        icon: GitCompare },
    { id: "mejor-hora", label: t.analytics_tab_best_time,      icon: Clock },
    { id: "objetivos",  label: t.analytics_tab_goals,          icon: Target },
    { id: "roi",        label: t.analytics_tab_roi,   icon: Zap },
  ]

  const accA = wsAccounts.find(a => a.id === cmpA)
  const accB = wsAccounts.find(a => a.id === cmpB)

  const handleKpiClick = (metric: MetricKey) => {
    if (nextSlot === "A") { setChartA(metric); setNextSlot("B") }
    else { setChartB(metric); setNextSlot("A") }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="section-pill bg-blue-500/10 text-blue-400 border-blue-500/20 mb-3">
            <BarChart3 className="size-3" /> Performance Report
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white gap-2" style={{ fontFamily: "var(--font-syne)" }}>
            Performance <span className="gradient-text-blue">Analytics</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">
            Monitor growth, engagement and real reach.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl">
            {[
              { id: "7d", label: t.analytics_7d },
              { id: "30d", label: t.analytics_30d },
              { id: "90d", label: t.analytics_90d }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  dateFilter === f.id
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-muted-foreground hover:text-white/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button onClick={() => exportCSV(wsAccounts, activeWorkspace?.name || "workspace")} variant="outline" className="glass border-white/10 h-10 px-4 rounded-xl font-bold text-sm hover:bg-white/5 text-white flex items-center gap-2">
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05] w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white/10 text-white shadow"
                : "text-muted-foreground/60 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <tab.icon className="size-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════ TAB: MÉTRICAS ═══════════════════ */}
      {activeTab === "metricas" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MousePointerClick className="size-3 text-muted-foreground/40" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                Click metric → Chart {nextSlot}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {kpiList.map(m => {
                const activeChart = chartA === m.metricKey ? "A" : chartB === m.metricKey ? "B" : null
                return (
                  <Card
                    key={m.title}
                    onClick={() => handleKpiClick(m.metricKey)}
                    className={`glass border-white/[0.07] group cursor-pointer transition-all duration-200 hover:scale-[1.02] select-none ${activeChart ? "ring-1 ring-violet-500/40" : ""}`}
                  >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                      <div className={`size-9 rounded-xl ${m.bg} ${m.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <m.icon className="size-4" />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {activeChart && <div className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">G{activeChart}</div>}
                        <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${m.up === null ? "bg-white/5 text-muted-foreground/60" : m.up ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>{m.change}</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-black tracking-tighter text-white mb-1">{isLoading ? "..." : m.value}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{m.title}</div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <MetricChart metric={chartA} data={chartData} index={0} />
            <MetricChart metric={chartB} data={chartData} index={1} />
          </div>

          {/* Tabla cuentas */}
          <Card className="glass border-white/[0.07] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>Performance by Channel</CardTitle>
              <CardDescription>Metrics comparison for accounts linked to this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/[0.03]">
                    <TableRow className="hover:bg-transparent border-white/[0.05]">
                      <TableHead className="stat-chip h-10 pl-6">Account</TableHead>
                      <TableHead className="stat-chip h-10 text-right">Audience</TableHead>
                      <TableHead className="stat-chip h-10 text-right">Views</TableHead>
                      <TableHead className="stat-chip h-10 text-right">Posts</TableHead>
                      <TableHead className="stat-chip h-10 text-right pr-6">Eng. Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wsAccounts.sort((a, b) => b.followers - a.followers).map(acc => (
                      <TableRow key={acc.id} className="hover:bg-white/[0.02] transition-colors border-white/[0.05] group">
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20 shrink-0">
                              <Video className="size-4" />
                            </div>
                            <span className="text-sm font-bold text-white/90">{acc.handle}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-black text-white/80">{acc.followers.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold text-muted-foreground/60">{acc.posts}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className="glass-sm border-violet-500/30 text-violet-400 font-extrabold text-[10px] px-2">
                            {acc.engagement}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {wsAccounts.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="py-16 text-center text-muted-foreground/40 italic">No linked accounts.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════ TAB: COMPARAR ═══════════════════ */}
      {activeTab === "comparar" && (
        <div className="space-y-6">
          <Card className="glass border-white/[0.07]">
            <CardHeader>
              <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>Compare Accounts</CardTitle>
              <CardDescription>Select 2 accounts to see their metrics side by side.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[{ val: cmpA, set: setCmpA, label: "Cuenta A" }, { val: cmpB, set: setCmpB, label: "Cuenta B" }].map(({ val, set, label }) => (
                  <div key={label}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2">{label}</p>
                    <select
                      value={val}
                      onChange={e => set(e.target.value)}
                      className="w-full h-10 rounded-xl glass border border-white/[0.07] px-3 text-sm font-bold text-white bg-transparent outline-none focus:border-violet-500/50 cursor-pointer"
                    >
                      <option value="" className="bg-gray-900">Select...</option>
                      {wsAccounts.map(a => <option key={a.id} value={a.id} className="bg-gray-900">{a.handle}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {accA && accB ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[accA, accB].map((acc, i) => (
                <Card key={acc.id} className={`glass overflow-hidden ${i === 0 ? "border-violet-500/20" : "border-blue-500/20"}`}>
                  <CardHeader className="pb-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center font-black text-lg mb-2 ${i === 0 ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400"}`}>
                      {acc.handle[1]?.toUpperCase()}
                    </div>
                    <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>{acc.handle}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Followers",  value: acc.followers?.toLocaleString(), better: (accA.followers > accB.followers ? 0 : 1) === i },
                      { label: "Engagement", value: `${acc.engagement}%`,             better: (Number(accA.engagement) > Number(accB.engagement) ? 0 : 1) === i },
                      { label: "Likes",      value: acc.likes?.toLocaleString(),      better: (accA.likes > accB.likes ? 0 : 1) === i },
                      { label: "Posts",      value: acc.posts?.toString(),            better: (accA.posts > accB.posts ? 0 : 1) === i },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                        <span className="text-xs font-bold text-muted-foreground/60">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">{row.value}</span>
                          {row.better && <div className="size-1.5 rounded-full bg-emerald-400" title="Higher" />}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <GitCompare className="size-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/50 font-medium">Select 2 accounts to compare their metrics.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TAB: MEJOR HORA ═══════════════════ */}
      {activeTab === "mejor-hora" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: t.analytics_tab_best_time, value: bestHour.hora, sub: "Highest expected engagement", color: "text-emerald-400", bg: "bg-emerald-500/10" },
              { label: t.analytics_peak, value: "20h – 22h", sub: "Optimal TikTok window", color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: t.analytics_avoid, value: "02h – 05h", sub: "Minimum audience activity", color: "text-red-400", bg: "bg-red-500/10" },
            ].map(s => (
              <Card key={s.label} className="glass border-white/[0.07]">
                <CardContent className="p-5">
                  <div className={`size-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}><Clock className="size-4" /></div>
                  <div className={`text-2xl font-black tracking-tighter ${s.color} mb-1`}>{s.value}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</div>
                  <div className="text-xs text-muted-foreground/40 mt-1">{s.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="glass border-white/[0.07] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>Engagement by Hour of Day</CardTitle>
              <CardDescription>Based on global TikTok patterns + your current engagement rate.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-2 pr-2">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={horasData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradHoras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.19 150)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="oklch(0.60 0.19 150)" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hora" stroke="oklch(0.62 0.025 258)" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.62 0.025 258)" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip isPercent />} />
                  <Bar dataKey="v" radius={[4, 4, 0, 0]} maxBarSize={22}>
                    {horasData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.hora === bestHour.hora
                          ? "oklch(0.72 0.19 150)"
                          : entry.v >= 80 ? "oklch(0.68 0.20 270)"
                          : entry.v <= 10 ? "oklch(0.50 0.12 25)"
                          : "url(#gradHoras)"}
                      />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass border-violet-500/10">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground/60 font-medium leading-relaxed">
                <span className="text-violet-400 font-black">💡 Tip:</span> Data shows peak engagement windows on TikTok. Publish between <strong className="text-white">8pm and 10pm</strong> to maximize your reach. Wednesday and Thursday are the best days of the week to start a trend.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════ TAB: OBJETIVOS ═══════════════════ */}
      {activeTab === "objetivos" && (
        <div className="space-y-6">
          {/* Add goal form */}
          <Card className="glass border-violet-500/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center"><Target className="size-4" /></div>
                <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>{t.analytics_goal_new}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Account</p>
                  <select
                    value={newGoalAccount}
                    onChange={e => setNewGoalAccount(e.target.value)}
                    className="w-full h-10 rounded-xl glass border border-white/[0.07] px-3 text-sm font-bold text-white bg-transparent outline-none focus:border-violet-500/50"
                  >
                    <option value="" className="bg-gray-900">Seleccionar...</option>
                    {wsAccounts.map(a => <option key={a.id} value={a.id} className="bg-gray-900">{a.handle}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Metric</p>
                  <select
                    value={newGoalType}
                    onChange={e => setNewGoalType(e.target.value)}
                    className="w-full h-10 rounded-xl glass border border-white/[0.07] px-3 text-sm font-bold text-white bg-transparent outline-none focus:border-violet-500/50"
                  >
                    {GOAL_TYPES.map(t => <option key={t.value} value={t.value} className="bg-gray-900">{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Target</p>
                  <Input
                    type="number" placeholder={newGoalType === "engagement" ? "5" : "10000"}
                    value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)}
                    className="h-10 glass border-white/[0.07] rounded-xl font-bold"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Deadline (optional)</p>
                  <Input
                    type="date" value={newGoalDeadline} onChange={e => setNewGoalDeadline(e.target.value)}
                    className="h-10 glass border-white/[0.07] rounded-xl font-bold text-white/80"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddGoal}
                disabled={savingGoal || !newGoalAccount || !newGoalTarget}
                className="w-full rounded-xl h-10 font-bold bg-violet-600 hover:bg-violet-500"
              >
                <Plus className="size-4 mr-2" /> Add goal
              </Button>
            </CardContent>
          </Card>

          {/* Goals list */}
          {goals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Target className="size-12 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/50 font-medium">No goals defined yet.<br />Add one above to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map(goal => {
                const { current, pct } = getProgress(goal)
                const completed = pct >= 100
                const typeLabel = GOAL_TYPES.find(t => t.value === goal.type)?.label ?? goal.type
                return (
                  <Card key={goal.id} className={`glass border-white/[0.07] ${completed ? "border-emerald-500/20" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-black text-white">{goal.handle}</span>
                            {completed && <CheckCircle2 className="size-4 text-emerald-400" />}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                            {typeLabel} · Target: {goal.target.toLocaleString()}{goal.type === "engagement" ? "%" : ""}
                            {goal.deadline && ` · ${format(new Date(goal.deadline), "d MMM", { locale: enUS })}`}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="text-muted-foreground/30 hover:text-red-400 transition-colors">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-muted-foreground/60">Actual: {current.toLocaleString()}{goal.type === "engagement" ? "%" : ""}</span>
                          <span className={completed ? "text-emerald-400" : "text-violet-400"}>{pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${completed ? "bg-gradient-to-r from-emerald-500 to-teal-500" : "bg-gradient-to-r from-violet-500 to-purple-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
      {/* ═══════════════════ TAB: ROI MONETIZACIÓN ═══════════════════ */}
      {activeTab === "roi" && (
        <div className="space-y-6">
          <Card className="glass border-white/[0.07]">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2" style={{ fontFamily: "var(--font-syne)" }}>
                <Zap className="size-4 text-emerald-400" /> Monetization Calculator (Estimated ROI)
              </CardTitle>
              <CardDescription>Estimate passive income from the creator fund and fair sponsorship prices based on your views.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Monthly Views</label>
                      <span className="text-xl font-black text-white">{fmtN(roiViews)}</span>
                    </div>
                    <input 
                      type="range" min="1000" max="10000000" step="10000" 
                      value={roiViews} onChange={e => setRoiViews(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground/40">
                      <span>1K</span><span>10M+</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Estimated RPM ($ per 1,000 Views)</label>
                      <span className="text-xl font-black text-white">€{rpmRate.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0.05" max="2.00" step="0.05" 
                      value={rpmRate} onChange={e => setRpmRate(Number(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <p className="mt-2 text-xs text-muted-foreground/60 leading-snug">El RPM varía según el país y la retención del vídeo. La media en España/Latam suele estar entre 0.10€ y 0.50€. La media en EEUU es +$1.00.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="glass border-white/10 rounded-2xl p-5 relative overflow-hidden bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 size-24 bg-emerald-500/20 rounded-full blur-2xl" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Fondo de Creadores TikTok</p>
                    <div className="text-4xl font-black text-white tracking-tighter mb-1">
                      €{((roiViews / 1000) * rpmRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      <span className="text-lg text-emerald-400">/mes</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70">Ingreso 100% pasivo estimado por acumulación de vistas reales cualificadas.</p>
                  </div>

                  <div className="glass border-white/10 rounded-2xl p-5 relative overflow-hidden bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 size-24 bg-violet-500/20 rounded-full blur-2xl" />
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Precio Justo por Patrocinio Mención (1 min)</p>
                    </div>
                    <div className="text-4xl font-black text-white tracking-tighter mb-1">
                      €{(((roiViews / 1000) * rpmRate) * sponsorRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      <span className="text-lg text-violet-400">/vídeo</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 mb-3">Valor de mercado para cobrarle a marcas que quieran salir en un vídeo de estas métricas.</p>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase text-muted-foreground/50">Multiplicador de Nicho: x{sponsorRate.toFixed(1)}</span>
                      <input 
                        type="range" min="1" max="10" step="0.5" 
                        value={sponsorRate} onChange={e => setSponsorRate(Number(e.target.value))}
                        className="flex-1 accent-violet-500 h-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
