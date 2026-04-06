"use client"


import { useT } from "@/i18n"
import * as React from "react"
import { TrendingUp, RefreshCcw, Loader2, BadgeCheck, Users, Heart, FileText, Flame, Search, AlertCircle, UserPlus, Trash2, Info, BookmarkPlus, Bell, BellRing, X, Eye, Play, MessageCircle, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useWorkspace } from "@/context/workspace-context"

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

interface Competitor {
  id: string; handle: string; name: string; avatar: string; verified: boolean
  followers: number; followersFormatted: string; likes: number; posts: number
  engagement: number; bio: string; isManual?: boolean; workspaceId?: string
  topVideos?: { id: string; thumbnail: string; description: string; views: number; likes: number; comments: number; shares: number; createTime: number }[]
}

export default function CompetenciaPage() {
  const { activeWorkspace } = useWorkspace()
  const [competitors, setCompetitors] = React.useState<Competitor[]>([])
  const [loading, setLoading] = React.useState(false)
  const [warning, setWarning] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [searchInput, setSearchInput] = React.useState("")
  const [activeKeyword, setActiveKeyword] = React.useState("")
  const [manualHandle, setManualHandle] = React.useState("")
  const [addingManual, setAddingManual] = React.useState(false)
  const addingRef = React.useRef(false)
  const [manualError, setManualError] = React.useState<string | null>(null)
  const [selectedCompetitor, setSelectedCompetitor] = React.useState<Competitor | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [alerts, setAlerts] = React.useState<any[]>([])
  const [triggeredAlerts, setTriggeredAlerts] = React.useState<any[]>([])
  const [showAlertForm, setShowAlertForm] = React.useState<string | null>(null)
  const [alertThreshold, setAlertThreshold] = React.useState("")
  const [alertType, setAlertType] = React.useState<"followers" | "engagement">("followers")
  const [savingAlert, setSavingAlert] = React.useState(false)

  const fetchCompetitors = React.useCallback(async (kw?: string) => {
    setLoading(true); setError(null); setWarning(null)
    try {
      const params = new URLSearchParams()
      if (activeWorkspace?.id) params.set("workspaceId", activeWorkspace.id)
      if (kw) params.set("keyword", kw)
      const res = await fetch(`/api/competitors?${params}`)
      const data = await res.json()
      setCompetitors(data.competitors ?? [])
      setActiveKeyword(data.keyword ?? "")
      if (data.warning) setWarning(data.warning)
      if (!res.ok && data.error && !data.warning) setError(data.error)
    } catch { setError("Connection error with the API") } finally { setLoading(false) }
  }, [activeWorkspace])

  React.useEffect(() => {
    if (activeWorkspace) fetchCompetitors()
    fetch("/api/goals").then(r => r.ok ? r.json() : null).then(d => { if (d) setAlerts(d.alerts ?? []) })
  }, [activeWorkspace?.id])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); if (searchInput.trim()) fetchCompetitors(searchInput.trim()) }

  const handleAddManual = async () => {
    if (!manualHandle.trim() || addingRef.current) return
    addingRef.current = true; setAddingManual(true); setManualError(null)
    try {
      const res = await fetch("/api/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-manual", payload: { handle: manualHandle.trim().replace(/^@/, ""), workspaceId: activeWorkspace?.id ?? "" } }) })
      const data = await res.json()
      if (!res.ok) { setManualError(data.error); return }
      setManualHandle(""); fetchCompetitors(activeKeyword || undefined)
    } catch { setManualError("Error adding competitor") } finally { addingRef.current = false; setAddingManual(false) }
  }

  const handleDeleteManual = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    try {
      await fetch("/api/competitors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-manual", payload: { id } }) })
      setCompetitors(prev => prev.filter(c => c.id !== id)); setConfirmDeleteId(null)
    } catch { }
  }

  React.useEffect(() => {
    if (!alerts.length || !competitors.length) return
    const triggered = alerts.filter(alert => {
      const comp = competitors.find(c => c.handle.toLowerCase().replace(/^@/, "") === alert.handle.toLowerCase().replace(/^@/, ""))
      if (!comp) return false
      return (alert.type === "followers" ? comp.followers : comp.engagement) >= alert.threshold
    })
    setTriggeredAlerts(triggered)
  }, [alerts, competitors])

  const handleAddAlert = async (handle: string) => {
    if (!alertThreshold || savingAlert) return
    setSavingAlert(true)
    const res = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-alert", payload: { handle, type: alertType, threshold: alertThreshold } }) })
    const data = await res.json()
    if (res.ok) { setAlerts(data.alerts); setAlertThreshold(""); setShowAlertForm(null) }
    setSavingAlert(false)
  }

  const handleDismissAlert = async (id: string) => {
    setTriggeredAlerts(prev => prev.filter(a => a.id !== id))
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "dismiss-alert", payload: { id } }) })
  }

  const getAlertForCompetitor = (handle: string) => alerts.find(a => a.handle.toLowerCase().replace(/^@/, "") === handle.toLowerCase().replace(/^@/, ""))
  const topFollowers = competitors.length > 0 ? Math.max(...competitors.map(c => c.followers)) : 0
  const avgEng = competitors.length > 0 ? (competitors.reduce((s, c) => s + c.engagement, 0) / competitors.length).toFixed(2) : "0"
  const manualCount = competitors.filter(c => c.isManual).length

  return (
    <>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      {triggeredAlerts.map(alert => (
        <div key={alert.id} className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <BellRing className="size-5 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-black">Alert triggered · {alert.handle}</p>
            <p className="text-xs opacity-70">{alert.type === 'followers' ? 'Followers' : 'Engagement'} has exceeded {Number(alert.threshold).toLocaleString()}{alert.type === 'engagement' ? '%' : ''}</p>
          </div>
          <button onClick={() => handleDismissAlert(alert.id)} className="size-7 rounded-lg bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 transition-colors shrink-0"><X className="size-3.5" /></button>
        </div>
      ))}

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="section-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-3"><TrendingUp className="size-3" /> Live Competition</div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Rival <span className="gradient-text-green">Radar</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">TikTok creators in your niche · add manually or search by keyword.</p>
        </div>
        <Button onClick={() => fetchCompetitors(searchInput || undefined)} disabled={loading} className="font-bold rounded-full h-11 px-7 shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 shrink-0 w-full md:w-auto">
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />} Refresh analysis
        </Button>
      </div>

      <Card className="glass border-emerald-500/10">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <BookmarkPlus className="size-4 text-emerald-400" />
            <span className="text-sm font-black text-white">Add competitor manually</span>
            {manualCount > 0 && <Badge variant="outline" className="glass-sm border-emerald-500/30 text-emerald-400 text-[9px] font-black ml-1">{manualCount} saved</Badge>}
          </div>
          <p className="text-xs text-muted-foreground/60 font-medium mb-3">Enter the TikTok @handle of a rival. We'll try to fetch their real data automatically.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-sm font-bold">@</span>
              <Input placeholder="rival_handle" value={manualHandle} onChange={e => { setManualHandle(e.target.value); setManualError(null) }} onKeyDown={e => e.key === "Enter" && handleAddManual()} className="pl-8 h-11 glass border-white/[0.07] rounded-2xl font-medium" />
            </div>
            <Button onClick={handleAddManual} disabled={addingManual || !manualHandle.trim()} className="h-11 px-6 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 shrink-0">
              {addingManual ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserPlus className="size-4 mr-2" />} Add
            </Button>
          </div>
          {manualError && <p className="mt-2 text-xs text-red-400 font-medium flex items-center gap-1.5"><AlertCircle className="size-3 shrink-0" /> {manualError}</p>}
        </CardContent>
      </Card>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
          <Input placeholder="Search niche (e.g. fitness, crypto, cooking)" value={searchInput} onChange={e => setSearchInput(e.target.value)} className="pl-11 h-11 glass border-white/[0.07] rounded-2xl font-medium" />
        </div>
        <Button type="submit" variant="outline" className="glass border-white/[0.07] h-11 px-6 rounded-2xl font-bold hover:bg-white/5 shrink-0">Search</Button>
      </form>

      {activeKeyword && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-medium">
          <span>Showing results for:</span>
          <Badge variant="outline" className="glass-sm border-emerald-500/30 text-emerald-400 font-bold">{activeKeyword}</Badge>
        </div>
      )}

      {warning && <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-400"><Info className="size-4 shrink-0 mt-0.5" /><p className="text-sm font-medium">{warning}</p></div>}
      {error && !warning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div><p className="text-sm font-bold">Error fetching data</p><p className="text-xs opacity-70 mt-0.5">{error}</p></div>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Accounts analyzed", value: competitors.length.toString(), icon: Users,      color: "text-violet-400",  bg: "bg-violet-500/10" },
            { label: "Largest audience",  value: fmt(topFollowers),             icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Avg. engagement",   value: `${avgEng}%`,                  icon: Flame,      color: "text-orange-400",  bg: "bg-orange-500/10" },
          ].map(s => (
            <Card key={s.label} className="glass border-white/[0.07]">
              <CardContent className="p-5">
                <div className={`size-8 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}><s.icon className="size-4" /></div>
                <div className="text-2xl font-black tracking-tighter text-white">{s.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="size-10 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground/60 font-medium">Analyzing TikTok creators...</p>
        </div>
      )}

      {!loading && competitors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">{competitors.length} creator{competitors.length > 1 ? "s" : ""} being tracked</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitors.map((c, i) => (
              <Card key={c.id} className={`glass border-white/[0.07] overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer relative ${c.isManual ? "border-emerald-500/15" : ""}`} onClick={() => setSelectedCompetitor(c)}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`size-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${c.isManual ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-violet-500/10 border border-violet-500/20 text-violet-400"}`}>
                      {c.isManual ? <BookmarkPlus className="size-4" /> : `#${i + 1}`}
                    </div>
                    {c.avatar ? <img src={c.avatar} alt={c.handle} className="size-11 rounded-xl object-cover border border-white/10 shrink-0" /> : <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black shrink-0">{c.name[0]?.toUpperCase()}</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white text-sm truncate" style={{ fontFamily: "var(--font-syne)" }}>{c.name}</span>
                        {c.verified && <BadgeCheck className="size-3.5 text-blue-400 shrink-0" />}
                        {c.isManual && <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400 px-1 py-0 font-black">Manual</Badge>}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">{c.handle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[{ label: "Followers", value: fmt(c.followers) }, { label: "Likes", value: fmt(c.likes) }, { label: "Videos", value: fmt(c.posts) }].map(s => (
                      <div key={s.label} className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                        <div className="text-base font-black text-white tracking-tight">{s.value}</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Engagement</span>
                    <Badge variant="outline" className="glass-sm border-emerald-500/30 text-emerald-400 font-black text-[10px] px-2">{c.engagement}%</Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000" style={{ width: `${Math.min(c.engagement, 100)}%` }} /></div>

                  {c.bio && <p className="text-[11px] text-muted-foreground/50 line-clamp-2 font-medium italic border-t border-white/5 pt-3">{c.bio}</p>}

                  {c.topVideos && c.topVideos.length > 0 && (
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-1.5"><Play className="size-2.5" /> Top {c.topVideos.length} viral videos</p>
                      <div className="space-y-1.5">
                        {c.topVideos.map((v, vi) => (
                          <div key={v.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.025] border border-white/[0.04]">
                            <div className="relative size-10 rounded-lg overflow-hidden shrink-0 bg-black/40">
                              {v.thumbnail ? <img src={v.thumbnail} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : null}
                              <div className="absolute inset-0 flex items-center justify-center"><span className="text-[9px] font-black text-white/50">#{vi + 1}</span></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground/60 truncate leading-snug mb-1">{v.description?.replace(/#\w+/g, '').trim().slice(0, 50) || `Video #${vi + 1}`}</p>
                              <div className="flex items-center gap-3 text-[9px] font-black">
                                <span className="flex items-center gap-1 text-pink-400"><Eye className="size-2.5" /> {fmt(v.views)}</span>
                                <span className="flex items-center gap-1 text-rose-400"><Heart className="size-2.5" /> {fmt(v.likes)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/5 pt-3 space-y-2">
                    {(() => {
                      const existingAlert = getAlertForCompetitor(c.handle)
                      return (
                        <>
                          <button onClick={() => setShowAlertForm(showAlertForm === c.id ? null : c.id)} className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${existingAlert ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-muted-foreground/30 hover:text-amber-400/70 hover:bg-amber-500/5'}`}>
                            {existingAlert ? <BellRing className="size-3" /> : <Bell className="size-3" />}
                            {existingAlert ? `Alert: >${Number(existingAlert.threshold).toLocaleString()}${existingAlert.type === 'engagement' ? '%' : ''}` : 'Set alert'}
                          </button>
                          {showAlertForm === c.id && (
                            <div className="space-y-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                              <div className="flex gap-2">
                                <select value={alertType} onChange={e => setAlertType(e.target.value as any)} className="flex-1 h-8 rounded-lg glass border border-white/10 px-2 text-xs font-bold text-white bg-transparent outline-none">
                                  <option value="followers" className="bg-gray-900">Followers</option>
                                  <option value="engagement" className="bg-gray-900">Engagement %</option>
                                </select>
                                <input type="number" placeholder={alertType === 'engagement' ? '5' : '10000'} value={alertThreshold} onChange={e => setAlertThreshold(e.target.value)} className="flex-1 h-8 rounded-lg glass border border-white/10 px-2 text-xs font-bold text-white bg-transparent outline-none" />
                              </div>
                              <button onClick={() => handleAddAlert(c.handle)} disabled={savingAlert || !alertThreshold} className="w-full text-[10px] font-black uppercase py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50">
                                {savingAlert ? 'Saving...' : 'Save alert'}
                              </button>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {c.isManual && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteManual(c.id) }} className={`w-full text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${confirmDeleteId === c.id ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-muted-foreground/30 hover:text-red-400/60 hover:bg-red-500/5'}`}>
                      <Trash2 className="size-3 inline mr-1" />
                      {confirmDeleteId === c.id ? 'Confirm deletion?' : 'Remove'}
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && competitors.length === 0 && (
        <Card className="glass border-white/[0.07] border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20"><TrendingUp className="size-8" /></div>
            <div>
              <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>No results yet</h3>
              <p className="text-sm text-muted-foreground/60 max-w-xs font-medium">Add competitors manually by @handle or search a specific niche.</p>
            </div>
            <Button onClick={() => fetchCompetitors()} className="bg-emerald-600 hover:bg-emerald-500 font-bold rounded-full px-7 h-11"><RefreshCcw className="mr-2 size-4" /> Analyze now</Button>
          </CardContent>
        </Card>
      )}
    </div>

    {selectedCompetitor && (() => {
      const comp = selectedCompetitor
      return (
        <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSelectedCompetitor(null)} />
        <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 overflow-y-auto bg-[#0d0d14] border-l border-white/[0.07] shadow-2xl">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">Competitor profile</span>
              <button onClick={() => setSelectedCompetitor(null)} className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><X className="size-4 text-white/60" /></button>
            </div>
            <div className="flex items-center gap-4">
              {comp.avatar ? <img src={comp.avatar} alt="" referrerPolicy="no-referrer" className="size-16 rounded-2xl object-cover border border-white/10" /> : <div className="size-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-black">{comp.name[0]?.toUpperCase()}</div>}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white truncate" style={{ fontFamily: 'var(--font-syne)' }}>{comp.name}</h2>
                  {comp.verified && <BadgeCheck className="size-5 text-blue-400 shrink-0" />}
                </div>
                <p className="text-sm font-bold text-emerald-400">{comp.handle}</p>
                {comp.bio && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{comp.bio}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Followers',   value: fmt(comp.followers),   color: 'text-emerald-400', icon: Users },
                { label: 'Total Likes', value: fmt(comp.likes),       color: 'text-pink-400',    icon: Heart },
                { label: 'Videos',      value: fmt(comp.posts),       color: 'text-violet-400',  icon: FileText },
                { label: 'Engagement',  value: `${comp.engagement}%`, color: 'text-orange-400',  icon: Flame },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl glass border border-white/[0.07] flex items-center gap-3">
                  <s.icon className={`size-5 ${s.color} shrink-0`} />
                  <div><div className="text-lg font-black text-white">{s.value}</div><div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</div></div>
                </div>
              ))}
            </div>
            {comp.topVideos && comp.topVideos.length > 0 && (() => {
              const totalRealViews = comp.topVideos!.reduce((s, v) => s + v.views, 0)
              const avgViews = Math.round(totalRealViews / comp.topVideos!.length)
              const topView = comp.topVideos![0]?.views ?? 0
              return (
                <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-pink-400/70 mb-1">Real views · Top 5 videos</p>
                  <div className="flex items-baseline gap-2"><span className="text-2xl font-black text-white">{fmt(totalRealViews)}</span><span className="text-xs text-pink-400 font-bold">total views</span></div>
                  <div className="flex gap-4 mt-2">
                    <p className="text-[10px] text-muted-foreground/50">🏆 Most viral: {fmt(topView)} views</p>
                    <p className="text-[10px] text-muted-foreground/50">∅ Avg: {fmt(avgViews)}/video</p>
                  </div>
                </div>
              )
            })()}
            {comp.topVideos && comp.topVideos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-2"><Play className="size-3" /> Top {comp.topVideos.length} most viewed videos</h3>
                {comp.topVideos.map((v, vi) => {
                  const videoUrl = v.id && !v.id.startsWith('post-') ? `https://www.tiktok.com/@${comp.handle.replace(/^@/, '')}/video/${v.id}` : null
                  return (
                    <a key={v.id} href={videoUrl ?? undefined} target="_blank" rel="noopener noreferrer" className={`flex gap-3 p-3 rounded-2xl glass border border-white/[0.06] hover:border-white/[0.12] transition-colors group ${videoUrl ? 'cursor-pointer' : 'cursor-default'}`} onClick={e => !videoUrl && e.preventDefault()}>
                      <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-black/40">
                        {v.thumbnail ? <img src={v.thumbnail} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} /> : null}
                        <div className="absolute inset-0 flex items-end justify-start p-1"><span className="text-[9px] font-black bg-black/70 text-white/80 rounded-md px-1.5 py-0.5">#{vi + 1}</span></div>
                        {videoUrl && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"><span className="text-[9px] font-black text-white">View ↗</span></div>}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <p className="text-[11px] text-muted-foreground/70 leading-snug line-clamp-3">{v.description?.replace(/#\w+/g, '').trim() || `Video #${vi + 1}`}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                          <span className="flex items-center gap-1 text-[10px] font-black text-pink-400"><Eye className="size-3" /> {fmt(v.views)}</span>
                          <span className="flex items-center gap-1 text-[10px] font-black text-rose-400"><Heart className="size-3" /> {fmt(v.likes)}</span>
                          <span className="flex items-center gap-1 text-[10px] font-black text-blue-400"><MessageCircle className="size-3" /> {fmt(v.comments)}</span>
                          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400"><Share2 className="size-3" /> {fmt(v.shares)}</span>
                        </div>
                      </div>
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        </>
      )
    })()}
    </>
  )
}
