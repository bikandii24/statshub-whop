"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react"
import {
  Users, Database, TrendingUp, Download, Search, Shield,
  Eye, EyeOff, BarChart3, Activity, Globe, RefreshCw
} from "lucide-react"

// ── Platform config ───────────────────────────────────────────────────────────
const PC: Record<string, { emoji: string; color: string }> = {
  tiktok:    { emoji: "🎵", color: "#EC4899" },
  instagram: { emoji: "📸", color: "#F43F5E" },
  youtube:   { emoji: "▶️", color: "#EF4444" },
  facebook:  { emoji: "👥", color: "#3B82F6" },
  twitter:   { emoji: "𝕏",  color: "#38BDF8" },
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n)

function downloadCSV(data: any[]) {
  // Export anonymized data only — no emails, no personal identifiers
  const headers = ["handle", "platform", "followers", "posts", "views", "engagement", "verified", "lastSync"]
  const rows = data.map(a => headers.map(h => {
    const v = a[h]
    if (v === null || v === undefined) return '""'
    return JSON.stringify(String(v))
  }).join(","))
  const csv  = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url; link.download = `statshub-market-data-${Date.now()}.csv`
  link.click(); URL.revokeObjectURL(url)
}

// ── Admin Panel ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [key,     setKey]     = React.useState("")
  const [authed,  setAuthed]  = React.useState(false)
  const [showKey, setShowKey] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error,   setError]   = React.useState("")
  const [data,    setData]    = React.useState<any>(null)
  const [search,  setSearch]  = React.useState("")
  const [tab,     setTab]     = React.useState<"accounts" | "users">("accounts")
  const [platformFilter, setPlatformFilter] = React.useState("all")

  async function login() {
    if (!key.trim()) return
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(key)}`)
      if (!res.ok) { setError("Invalid admin key."); setLoading(false); return }
      const json = await res.json()
      setData(json); setAuthed(true)
    } catch { setError("Network error.") }
    setLoading(false)
  }

  async function refresh() {
    if (!authed) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?key=${encodeURIComponent(key)}`)
      const json = await res.json()
      setData(json)
    } catch {}
    setLoading(false)
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="size-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="size-7 text-violet-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Admin Access</h1>
            <p className="text-sm text-muted-foreground/60 mt-1">Enter your admin key to continue</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && login()}
                placeholder="ADMIN_KEY"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-violet-500/40 pr-10"
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-3 text-muted-foreground/50 hover:text-white">
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm font-bold">{error}</p>}
            <button
              onClick={login}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black transition-all disabled:opacity-50"
            >
              {loading ? "Checking…" : "Enter"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────
  const { stats, allAccounts, users } = data ?? { stats: {}, allAccounts: [], users: [] }

  const filtered = allAccounts.filter((a: any) => {
    const matchSearch = !search || a.handle.toLowerCase().includes(search.toLowerCase()) || a.addedBy?.toLowerCase().includes(search.toLowerCase())
    const matchPlatform = platformFilter === "all" || a.platform === platformFilter
    return matchSearch && matchPlatform
  })

  const platforms = ["all", "tiktok", "instagram", "youtube", "facebook", "twitter"]

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.07] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Database className="size-4 text-violet-400" />
          </div>
          <div>
            <h1 className="font-black text-white text-sm" style={{ fontFamily: "var(--font-syne, system-ui)" }}>StatsHub Admin</h1>
            <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">Internal Dashboard</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 text-xs font-bold text-muted-foreground/60 hover:text-white border border-white/10 rounded-xl px-3 py-2 hover:bg-white/5">
            <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={() => downloadCSV(allAccounts)} className="flex items-center gap-2 text-xs font-bold text-emerald-400 border border-emerald-500/30 rounded-xl px-3 py-2 hover:bg-emerald-500/10">
            <Download className="size-3" /> Export CSV ({allAccounts.length})
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Users", value: stats.totalUsers ?? 0, color: "#8B5CF6" },
            { icon: BarChart3, label: "Total Accounts", value: stats.totalAccounts ?? 0, color: "#EC4899" },
            { icon: TrendingUp, label: "Avg Accounts/User", value: stats.totalUsers ? (stats.totalAccounts / stats.totalUsers).toFixed(1) : "0", color: "#10B981" },
            { icon: Globe, label: "Platforms", value: Object.keys(stats.byPlatform ?? {}).length, color: "#F59E0B" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-4" style={{ color }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{label}</span>
              </div>
              <div className="text-3xl font-black text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Platform Breakdown ── */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground/50 mb-4">Accounts by Platform</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.byPlatform ?? {}).map(([plat, count]: any) => {
              const cfg = PC[plat] ?? { emoji: "🔗", color: "#999" }
              return (
                <div key={plat} className="flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold"
                  style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}10`, color: cfg.color }}>
                  {cfg.emoji} {plat} · {count}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2">
          {(["accounts", "users"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${tab === t ? "bg-violet-500/20 border-violet-500/30 text-violet-400" : "border-white/10 text-muted-foreground/50 hover:bg-white/5"}`}>
              {t === "accounts" ? `Accounts (${allAccounts.length})` : `Users (${users.length})`}
            </button>
          ))}
        </div>

        {/* ── Accounts Table ── */}
        {tab === "accounts" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex-1 min-w-48">
                <Search className="size-3.5 text-muted-foreground/50" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search handle or user…"
                  className="bg-transparent text-white text-sm outline-none flex-1 placeholder:text-muted-foreground/30" />
              </div>
              <div className="flex gap-1">
                {platforms.map(p => {
                  const cfg = PC[p]
                  return (
                    <button key={p} onClick={() => setPlatformFilter(p)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all ${platformFilter === p ? "bg-white/10 border-white/20 text-white" : "border-white/10 text-muted-foreground/50 hover:bg-white/5"}`}
                      style={platformFilter === p && cfg ? { borderColor: `${cfg.color}40`, color: cfg.color, background: `${cfg.color}10` } : {}}>
                      {cfg ? `${cfg.emoji}` : "All"}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Table */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/[0.07]">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {["Platform", "Handle", "Followers", "Posts", "Views", "Engagement", "Verified", "User", "Last Sync"].map(h => (
                        <th key={h} className="text-left px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9} className="text-center py-12 text-muted-foreground/40">No accounts found</td></tr>
                    ) : filtered.map((a: any, i: number) => {
                      const cfg = PC[a.platform] ?? { emoji: "🔗", color: "#999" }
                      return (
                        <tr key={a.id ?? i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: cfg.color }}>
                              {cfg.emoji} {a.platform}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white text-xs">{a.handle}</td>
                          <td className="px-4 py-3 font-bold text-emerald-400">{fmt(a.followers ?? 0)}</td>
                          <td className="px-4 py-3 text-muted-foreground/70">{a.posts ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground/70">{a.views ? fmt(a.views) : "—"}</td>
                          <td className="px-4 py-3 text-violet-400">{a.engagement ? `${a.engagement}%` : "—"}</td>
                          <td className="px-4 py-3">{a.verified ? "✓" : "—"}</td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground/50 font-mono">{a.addedBy}</td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground/40">
                            {a.lastSync ? new Date(a.lastSync).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-white/[0.07] text-xs text-muted-foreground/40">
                Showing {filtered.length} of {allAccounts.length} accounts
              </div>
            </div>
          </div>
        )}

        {/* ── Users Table ── */}
        {tab === "users" && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.07]">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                    {["User ID", "Email", "Whop ID", "Plan", "Accounts", "Joined"].map(h => (
                      <th key={h} className="text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-muted-foreground/40">No users found</td></tr>
                  ) : users.map((u: any, i: number) => (
                    <tr key={u.userId ?? i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground/50">{u.userId?.slice(0, 12)}…</td>
                      <td className="px-4 py-3 font-bold text-white text-xs">{u.email}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground/50">{u.whopId ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          {u.plan ?? "free"}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-violet-400">{u.accountCount}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground/40">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Export note ── */}
        <p className="text-[11px] text-muted-foreground/30 text-center">
          This panel is for internal use only. Not linked in the navigation. URL: /admin
        </p>
      </div>
    </div>
  )
}
