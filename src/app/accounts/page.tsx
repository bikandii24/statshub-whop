import { useT } from "@/i18n"
import * as React from "react"
import { useWorkspace } from "@/context/workspace-context"
import type { SocialPlatform } from "@/context/workspace-context"
import { useRouter } from "next/navigation"
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card"
import {
  Users, Heart, Video, Zap, RefreshCw, Trash2, Plus, X,
  Eye, BarChart3, Sparkles, ChevronDown,
} from "lucide-react"

// ── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<SocialPlatform, {
  label: string; emoji: string; color: string; bg: string; border: string; glow: string; placeholder: string
}> = {
  tiktok:    { label: "TikTok",      emoji: "🎵", color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20",    glow: "rgba(236,72,153,0.8)",   placeholder: "username" },
  instagram: { label: "Instagram",   emoji: "📸", color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    glow: "rgba(251,113,133,0.8)",  placeholder: "username" },
  youtube:   { label: "YouTube",     emoji: "▶️", color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     glow: "rgba(248,113,113,0.8)",  placeholder: "channel or @handle" },
  facebook:  { label: "Facebook",    emoji: "👥", color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    glow: "rgba(96,165,250,0.8)",   placeholder: "page-slug or full URL" },
  twitter:   { label: "X (Twitter)", emoji: "𝕏",  color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20",     glow: "rgba(56,189,248,0.8)",   placeholder: "username" },
}
const PLATFORMS = Object.keys(PLATFORM_CONFIG) as SocialPlatform[]

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : n.toString()

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return "just now"
  if (diff < 60) return `${diff}m ago`
  const h = Math.floor(diff / 60)
  if (h < 24)    return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Platform Badge ────────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform: SocialPlatform }) {
  const cfg = PLATFORM_CONFIG[platform]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${cfg.bg} ${cfg.border} ${cfg.color}`}> 
      <span>{cfg.emoji}</span>{cfg.label}
    </span>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AccountsPage() {
  const t = useT()
  const { accounts, activeWorkspace, addAccount, syncAccount, deleteAccount, isLoading, apiConfigured } = useWorkspace()
  const router = useRouter()

  // ── State ──
  const [activePlatform, setActivePlatform] = React.useState<SocialPlatform | "all">("all")
  const [showModal, setShowModal] = React.useState(false)
  const [selectedPlatform, setSelectedPlatform] = React.useState<SocialPlatform>("tiktok")
  const [handle, setHandle] = React.useState("")
  const [manualFollowers, setManualFollowers] = React.useState("")
  const [manualViews, setManualViews] = React.useState("")
  const [manualPosts, setManualPosts] = React.useState("")
  const [manualEngagement, setManualEngagement] = React.useState("")
  const [adding, setAdding] = React.useState(false)
  const [addError, setAddError] = React.useState("")
  const [syncingId, setSyncingId] = React.useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)

  // ── Computed ──
  const wsAccounts = accounts.filter(a => a.workspaceId === activeWorkspace?.id)
  const filteredAccounts = activePlatform === "all"
    ? wsAccounts
    : wsAccounts.filter(a => (a.platform ?? "tiktok") === activePlatform)

  const kpis = React.useMemo(() => {
    const src = filteredAccounts
    return {
      audience:   src.reduce((s, a) => s + (a.followers || 0), 0),
      likes:      src.reduce((s, a) => s + (a.likes || 0), 0),
      posts:      src.reduce((s, a) => s + (a.posts || 0), 0),
      engagement: src.length > 0
        ? (src.reduce((s, a) => s + Number(a.engagement || 0), 0) / src.length).toFixed(1)
        : "0",
    }
  }, [filteredAccounts])

  // ── Handlers ──
  const resetModal = () => {
    setHandle(""); setAddError(""); setManualFollowers(""); setManualViews("")
    setManualPosts(""); setManualEngagement(""); setAdding(false)
  }

  const handleAdd = async () => {
    if (!handle.trim()) return
    setAdding(true); setAddError("")
    const manualData = selectedPlatform !== "tiktok" ? {
      followers: manualFollowers ? Number(manualFollowers) : 0,
      views:     manualViews     ? Number(manualViews)     : 0,
      posts:     manualPosts     ? Number(manualPosts)     : 0,
      engagement: manualEngagement ? Number(manualEngagement) : 0,
    } : undefined
    const res = await addAccount(handle.trim(), selectedPlatform, manualData)
    if (!res.success) { setAddError(res.error ?? "Error"); setAdding(false); return }
    setShowModal(false); resetModal()
  }

  const handleSync = async (id: string) => {
    setSyncingId(id)
    await syncAccount(id)
    setSyncingId(null)
  }

  // ── Platform tabs ──
  const platformCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: wsAccounts.length }
    for (const p of PLATFORMS) counts[p] = wsAccounts.filter(a => (a.platform ?? "tiktok") === p).length
    return counts
  }, [wsAccounts])

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="section-pill bg-pink-500/10 text-pink-400 border-pink-500/20">
              <BarChart3 className="size-3" /> Social Dashboard
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: "var(--font-syne)" }}>
            {t.tiktok_title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t.tiktok_subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white font-bold px-5 py-2.5 rounded-full text-sm transition-all hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/20 shrink-0"
        >
          <Plus className="size-4" /> {t.tiktok_add_account}
        </button>
      </div>

      {/* ── Platform Tabs ── */}
      <div className="flex flex-wrap gap-2">
        {/* All tab */}
        <button
          onClick={() => setActivePlatform("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
            activePlatform === "all"
              ? "bg-white/10 border-white/20 text-white"
              : "border-white/10 text-muted-foreground/60 hover:bg-white/5 hover:text-white"
          }`}
        >
          All · {platformCounts.all}
        </button>
        {PLATFORMS.map(p => {
          const cfg = PLATFORM_CONFIG[p]
          const count = platformCounts[p]
          if (count === 0 && activePlatform !== p) return null
          return (
            <button
              key={p}
              onClick={() => setActivePlatform(p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border transition-all ${
                activePlatform === p
                  ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                  : "border-white/10 text-muted-foreground/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>{cfg.emoji}</span> {cfg.label}{count > 0 && ` · ${count}`}
            </button>
          )
        })}
      </div>

      {/* ── KPI Strip ── */}
      {wsAccounts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: t.tiktok_total_audience, value: fmt(kpis.audience),   icon: Users },
            { label: t.tiktok_total_likes,    value: fmt(kpis.likes),      icon: Heart },
            { label: t.tiktok_videos,         value: kpis.posts.toString(), icon: Video },
            { label: t.tiktok_avg_engagement, value: `${kpis.engagement}%`, icon: Zap   },
          ].map(k => (
            <Card key={k.label} className="glass border-white/[0.07]">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{k.label}</span>
                  <k.icon className="size-3.5 text-muted-foreground/30" />
                </div>
                <div className="text-2xl font-black text-white tracking-tighter">{isLoading ? "…" : k.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Account Cards ── */}
      {filteredAccounts.length === 0 ? (
        <Card className="glass border-white/[0.07] border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-16 gap-4">
            <div className="size-16 rounded-2xl bg-pink-500/10 flex items-center justify-center">
              <Plus className="size-8 text-pink-400/50" />
            </div>
            <p className="text-muted-foreground/60 text-sm font-medium text-center max-w-xs">
              {activePlatform === "all" ? t.tiktok_no_accounts_desc : `No ${PLATFORM_CONFIG[activePlatform as SocialPlatform]?.label ?? ""} accounts yet. Add one above.`}
            </p>
            <button
              onClick={() => { if (activePlatform !== "all") setSelectedPlatform(activePlatform as SocialPlatform); setShowModal(true) }}
              className="text-sm font-bold text-pink-400 hover:text-pink-300 transition-colors"
            >
              + {t.tiktok_add_first}
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAccounts.map(account => {
            const platform = (account.platform ?? "tiktok") as SocialPlatform
            const cfg = PLATFORM_CONFIG[platform]
            const isTikTok = platform === "tiktok"
            return (
              <Card key={account.id}
                onClick={() => router.push(`/cuenta/${account.id}`)}
                className={`glass border-white/[0.07] hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer`}
                style={{ boxShadow: `0 0 0 0 transparent` }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 30px -10px ${cfg.glow}`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 transparent`)}
              >
                <CardContent className="p-5">
                  {/* Top row */}
                  <div className="flex items-start gap-3 mb-4">
                    {account.avatar ? (
                      <img src={account.avatar} alt={account.handle}
                        className="size-12 rounded-xl object-cover shadow-lg" />
                    ) : (
                      <div className={`size-12 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                        <span className="text-xl">{cfg.emoji}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-white text-sm truncate">@{account.handle}</p>
                        {account.verified && <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full">✓ Verified</span>}
                      </div>
                      <PlatformBadge platform={platform} />
                    </div>
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      {/* Sync button */}
                      <button
                        onClick={e => { e.stopPropagation(); handleSync(account.id) }}
                        disabled={!!syncingId}
                        className="size-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground/50 hover:text-white transition-all"
                        title={t.tiktok_sync}
                      >
                        <RefreshCw className={`size-3.5 ${syncingId === account.id ? "animate-spin text-pink-400" : ""}`} />
                      </button>
                      {deleteConfirmId === account.id ? (
                        <button
                          onClick={e => { e.stopPropagation(); deleteAccount(account.id); setDeleteConfirmId(null) }}
                          className="size-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                        >
                          ✓
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirmId(account.id) }}
                          className="size-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-red-500/10 text-muted-foreground/50 hover:text-red-400 transition-all"
                          title={t.tiktok_delete}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: t.tiktok_followers, value: fmt(account.followers || 0), icon: Users, color: cfg.color },
                      { label: t.tiktok_likes,     value: fmt(account.likes || 0),     icon: Heart, color: "text-rose-400" },
                      { label: t.tiktok_posts,     value: (account.posts || 0).toString(), icon: Video, color: "text-violet-400" },
                      { label: t.tiktok_eng_rate,  value: `${account.engagement || 0}%`, icon: Zap,   color: "text-amber-400" },
                    ].map(s => (
                      <div key={s.label} className="glass-sm rounded-xl p-3 border border-white/[0.05]">
                        <div className="flex items-center gap-1 mb-1">
                          <s.icon className={`size-3 ${s.color}`} />
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</span>
                        </div>
                        <div className="text-lg font-black text-white tracking-tighter">{s.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground/40 font-medium">
                      {`Synced ${timeAgo(account.lastSync)}`}
                    </span>
                    {(account.views || 0) > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground/50">
                        <Eye className="size-3" /> {fmt(account.views)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── AI Copilot ── */}
      {wsAccounts.filter(a => (a.platform ?? "tiktok") === "tiktok").length > 0 && (
        <AICopilot accounts={wsAccounts.filter(a => (a.platform ?? "tiktok") === "tiktok")} t={t} />
      )}

      {/* ── Add Account Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); resetModal() }}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
          <div
            className="relative glass border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setShowModal(false); resetModal() }} className="absolute top-4 right-4 text-muted-foreground/40 hover:text-white">
              <X className="size-5" />
            </button>

            <h2 className="text-lg font-black text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>
              {t.tiktok_add_account}
            </h2>
            <p className="text-xs text-muted-foreground/60 mb-5">{t.tiktok_manage_desc}</p>

            {/* Step 1: Platform selector */}
            <div className="mb-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Platform</p>
              <div className="grid grid-cols-5 gap-2">
                {PLATFORMS.map(p => {
                  const cfg = PLATFORM_CONFIG[p]
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedPlatform(p)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                        selectedPlatform === p
                          ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                          : "border-white/10 text-muted-foreground/50 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-xl leading-none">{cfg.emoji}</span>
                      <span className="text-[8px] font-black uppercase leading-none">{cfg.label.split(" ")[0]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Handle */}
            <div className="mb-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 block">
                {selectedPlatform === "facebook" ? "Page URL or Slug" : "Handle / Username"}
              </label>
              <div className="flex items-center gap-2 glass-sm border border-white/10 rounded-xl px-4 py-3 focus-within:border-pink-500/40">
                {selectedPlatform !== "facebook" && (
                  <span className="text-muted-foreground/50 font-bold">@</span>
                )}
                <input
                  autoFocus
                  value={handle}
                  onChange={e => setHandle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAdd()}
                  placeholder={PLATFORM_CONFIG[selectedPlatform].placeholder}
                  className="flex-1 bg-transparent text-white font-bold text-sm outline-none placeholder:text-muted-foreground/30"
                />
              </div>
              {selectedPlatform === "facebook" && (
                <p className="text-[10px] text-muted-foreground/40 mt-1.5">
                  e.g. <span className="text-muted-foreground/60 font-mono">coca-cola</span> or <span className="text-muted-foreground/60 font-mono">facebook.com/coca-cola</span>
                </p>
              )}
            </div>

            {/* Auto-sync info — replaces manual stats form */}
            {selectedPlatform !== "tiktok" && (
              <div className="mb-4">
                <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border text-xs font-bold ${
                  selectedPlatform === "facebook"
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  <span className="text-base leading-none">
                    {selectedPlatform === "facebook" ? "👥" : selectedPlatform === "instagram" ? "📸" : selectedPlatform === "youtube" ? "▶️" : "𝕏"}
                  </span>
                  {selectedPlatform === "facebook"
                    ? "Stats fetched automatically via Facebook Scraper API"
                    : `Stats will be fetched automatically from ${PLATFORM_CONFIG[selectedPlatform]?.label ?? selectedPlatform} API`}
                </div>
              </div>
            )}

            {addError && (
              <p className="text-xs text-red-400 font-medium mb-3 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{addError}</p>
            )}

            <button
              onClick={handleAdd}
              disabled={adding || !handle.trim()}
              className={`w-full h-12 rounded-2xl font-black text-sm transition-all ${
                adding || !handle.trim()
                  ? "bg-white/5 text-muted-foreground/40 cursor-not-allowed"
                  : "bg-pink-600 hover:bg-pink-500 text-white hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-500/20"
              }`}
            >
              {adding
                ? (selectedPlatform === "tiktok" ? "Fetching data…" : "Adding…")
                : `${t.tiktok_add} @${handle || "handle"} on ${PLATFORM_CONFIG[selectedPlatform].label}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AI Copilot (TikTok only) ──────────────────────────────────────────────────
function AICopilot({ accounts, t }: { accounts: any[]; t: any }) {
  const [selectedAccount, setSelectedAccount] = React.useState("")
  const [niche, setNiche] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [ideas, setIdeas] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)

  const generate = async () => {
    if (!selectedAccount) return
    setLoading(true)
    setIdeas([])
    try {
      const res = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountHandle: selectedAccount, niche }),
      })
      const data = await res.json()
      if (data.ideas) setIdeas(data.ideas)
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <Card className="glass border-white/[0.07] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles className="size-4 text-violet-400" />
          </div>
          <div className="text-left">
            <p className="font-bold text-white text-sm">{t.tiktok_ai_copilot}</p>
            <p className="text-[11px] text-muted-foreground/60">{t.tiktok_ai_desc}</p>
          </div>
        </div>
        <ChevronDown className={`size-4 text-muted-foreground/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <CardContent className="pt-0 px-5 pb-5 border-t border-white/[0.05]">
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 block">{t.tiktok_ai_account}</label>
                <select
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full glass-sm border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white bg-transparent outline-none"
                >
                  <option value="">{t.tiktok_ai_select}</option>
                  {accounts.map(a => <option key={a.id} value={a.handle}>@{a.handle}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 block">{t.tiktok_ai_niche}</label>
                <input
                  value={niche}
                  onChange={e => setNiche(e.target.value)}
                  placeholder={t.tiktok_ai_niche_placeholder}
                  className="w-full glass-sm border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white bg-transparent outline-none focus:border-violet-500/40 placeholder:text-muted-foreground/30"
                />
              </div>
              <button
                onClick={generate}
                disabled={loading || !selectedAccount}
                className={`w-full h-11 rounded-2xl font-black text-sm transition-all ${
                  loading || !selectedAccount
                    ? "bg-white/5 text-muted-foreground/40 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 hover:scale-[1.02]"
                }`}
              >
                {loading ? "Generating…" : t.tiktok_ai_generate}
              </button>
            </div>
            <div className="space-y-3">
              {ideas.length === 0 ? (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <p className="text-xs text-muted-foreground/40">{t.tiktok_ai_empty}</p>
                </div>
              ) : (
                ideas.map((idea, i) => (
                  <div key={i} className="glass-sm border border-white/[0.07] rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="size-6 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-black text-violet-400">{i + 1}</span>
                      </div>
                      <p className="text-sm text-white/80 leading-relaxed">{idea}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
