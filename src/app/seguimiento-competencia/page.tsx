"use client"

import * as React from "react"
import {
  TrendingUp, RefreshCcw, Loader2, BadgeCheck, Users, Heart, FileText,
  Flame, Search, AlertCircle, UserPlus, Trash2, Info, BookmarkPlus,
  Bell, BellRing, BellOff, X, ChevronDown, ChevronUp, Eye, Play, ChevronRight, MessageCircle, Share2,
} from "lucide-react"
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
  id: string
  handle: string
  name: string
  avatar: string
  verified: boolean
  followers: number
  followersFormatted: string
  likes: number
  posts: number
  engagement: number
  bio: string
  isManual?: boolean
  workspaceId?: string
  topVideos?: {
    id: string
    thumbnail: string
    description: string
    views: number
    likes: number
    comments: number
    shares: number
    createTime: number
  }[]
}

export default function CompetenciaPage() {
  const { activeWorkspace } = useWorkspace()
  const [competitors, setCompetitors] = React.useState<Competitor[]>([])
  const [loading, setLoading] = React.useState(false)
  const [warning, setWarning] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [searchInput, setSearchInput] = React.useState("")
  const [activeKeyword, setActiveKeyword] = React.useState("")

  // Manual add state
  const [manualHandle, setManualHandle] = React.useState("")
  const [addingManual, setAddingManual] = React.useState(false)
  const addingRef = React.useRef(false)
  const [manualError, setManualError] = React.useState<string | null>(null)
  const [selectedCompetitor, setSelectedCompetitor] = React.useState<Competitor | null>(null)

  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)

  // Alerts state
  const [alerts, setAlerts] = React.useState<any[]>([])
  const [triggeredAlerts, setTriggeredAlerts] = React.useState<any[]>([])
  const [showAlertForm, setShowAlertForm] = React.useState<string | null>(null) // competitor id
  const [alertThreshold, setAlertThreshold] = React.useState("")
  const [alertType, setAlertType] = React.useState<"followers" | "engagement">("followers")
  const [savingAlert, setSavingAlert] = React.useState(false)

  const fetchCompetitors = React.useCallback(async (kw?: string) => {
    setLoading(true)
    setError(null)
    setWarning(null)
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
    } catch {
      setError("Error de conexión con la API")
    } finally {
      setLoading(false)
    }
  }, [activeWorkspace])

  React.useEffect(() => {
    if (activeWorkspace) fetchCompetitors()
    // Load alerts from API
    fetch("/api/goals").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setAlerts(d.alerts ?? [])
    })
  }, [activeWorkspace?.id])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) fetchCompetitors(searchInput.trim())
  }

  const handleAddManual = async () => {
    if (!manualHandle.trim() || addingRef.current) return
    addingRef.current = true
    setAddingManual(true)
    setManualError(null)
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-manual",
          payload: {
            handle: manualHandle.trim().replace(/^@/, ""),
            workspaceId: activeWorkspace?.id ?? "",
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setManualError(data.error); return }
      // Refresh list
      setManualHandle("")
      fetchCompetitors(activeKeyword || undefined)
    } catch {
      setManualError("Error al añadir competidor")
    } finally {
      addingRef.current = false
      setAddingManual(false)
    }
  }

  const handleDeleteManual = async (id: string) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    try {
      const res = await fetch("/api/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-manual", payload: { id } }),
      })
      await res.json()
      setCompetitors(prev => prev.filter(c => c.id !== id))
      setConfirmDeleteId(null)
    } catch { }
  }

  // Check triggered alerts whenever competitors or alerts change
  React.useEffect(() => {
    if (!alerts.length || !competitors.length) return
    const triggered = alerts.filter(alert => {
      const comp = competitors.find(c =>
        c.handle.toLowerCase().replace(/^@/, "") === alert.handle.toLowerCase().replace(/^@/, "")
      )
      if (!comp) return false
      const current = alert.type === "followers" ? comp.followers : comp.engagement
      return current >= alert.threshold
    })
    setTriggeredAlerts(triggered)
  }, [alerts, competitors])

  const handleAddAlert = async (handle: string) => {
    if (!alertThreshold || savingAlert) return
    setSavingAlert(true)
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add-alert",
        payload: { handle, type: alertType, threshold: alertThreshold },
      }),
    })
    const data = await res.json()
    if (res.ok) { setAlerts(data.alerts); setAlertThreshold(""); setShowAlertForm(null) }
    setSavingAlert(false)
  }

  const handleDismissAlert = async (id: string) => {
    setTriggeredAlerts(prev => prev.filter(a => a.id !== id))
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss-alert", payload: { id } }),
    })
  }

  const getAlertForCompetitor = (handle: string) =>
    alerts.find(a => a.handle.toLowerCase().replace(/^@/, "") === handle.toLowerCase().replace(/^@/, ""))

  const topFollowers = competitors.length > 0 ? Math.max(...competitors.map(c => c.followers)) : 0
  const avgEng = competitors.length > 0
    ? (competitors.reduce((s, c) => s + c.engagement, 0) / competitors.length).toFixed(2)
    : "0"
  const manualCount = competitors.filter(c => c.isManual).length

  return (
    <>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      {/* ── Triggered Alert Banners ── */}
      {triggeredAlerts.map(alert => (
        <div key={alert.id} className="flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
          <BellRing className="size-5 shrink-0 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-black">Alerta activada · {alert.handle}</p>
            <p className="text-xs opacity-70">{alert.type === 'followers' ? 'Seguidores' : 'Engagement'} ha superado {Number(alert.threshold).toLocaleString()}{alert.type === 'engagement' ? '%' : ''}</p>
          </div>
          <button onClick={() => handleDismissAlert(alert.id)} className="size-7 rounded-lg bg-amber-500/20 flex items-center justify-center hover:bg-amber-500/30 transition-colors shrink-0">
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="section-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/20 mb-3">
            <TrendingUp className="size-3" /> Competencia Real
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Radar de <span className="gradient-text-green">Rivales</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">
            Creadores de TikTok en tu nicho · añade manualmente o busca por palabra clave.
          </p>
        </div>
        <Button
          onClick={() => fetchCompetitors(searchInput || undefined)}
          disabled={loading}
          className="font-bold rounded-full h-11 px-7 shadow-xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 shrink-0 w-full md:w-auto"
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
          Actualizar análisis
        </Button>
      </div>

      {/* ── Add Manual Competitor ── */}
      <Card className="glass border-emerald-500/10">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <BookmarkPlus className="size-4 text-emerald-400" />
            <span className="text-sm font-black text-white">Añadir competidor manualmente</span>
            {manualCount > 0 && (
              <Badge variant="outline" className="glass-sm border-emerald-500/30 text-emerald-400 text-[9px] font-black ml-1">
                {manualCount} guardado{manualCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground/60 font-medium mb-3">
            Introduce el @handle de TikTok de un rival. Se intentará obtener sus datos reales automáticamente.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-sm font-bold">@</span>
              <Input
                placeholder="handle_del_rival"
                value={manualHandle}
                onChange={e => { setManualHandle(e.target.value); setManualError(null) }}
                onKeyDown={e => e.key === "Enter" && handleAddManual()}
                className="pl-8 h-11 glass border-white/[0.07] rounded-2xl font-medium"
              />
            </div>
            <Button
              onClick={handleAddManual}
              disabled={addingManual || !manualHandle.trim()}
              className="h-11 px-6 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 shrink-0"
            >
              {addingManual ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserPlus className="size-4 mr-2" />}
              Añadir
            </Button>
          </div>
          {manualError && (
            <p className="mt-2 text-xs text-red-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="size-3 shrink-0" /> {manualError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Search by keyword ── */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
          <Input
            placeholder="Buscar nicho (ej: fitness, crypto, cocina)"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-11 h-11 glass border-white/[0.07] rounded-2xl font-medium"
          />
        </div>
        <Button type="submit" variant="outline" className="glass border-white/[0.07] h-11 px-6 rounded-2xl font-bold hover:bg-white/5 shrink-0">
          Buscar
        </Button>
      </form>

      {activeKeyword && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-medium">
          <span>Mostrando resultados para:</span>
          <Badge variant="outline" className="glass-sm border-emerald-500/30 text-emerald-400 font-bold">
            {activeKeyword}
          </Badge>
        </div>
      )}

      {/* ── Warning (soft error) ── */}
      {warning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-amber-400">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{warning}</p>
        </div>
      )}

      {/* ── Hard Error ── */}
      {error && !warning && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Error al obtener datos</p>
            <p className="text-xs opacity-70 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Summary KPIs ── */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Cuentas analizadas", value: competitors.length.toString(), icon: Users,      color: "text-violet-400", bg: "bg-violet-500/10" },
            { label: "Mayor audiencia",    value: fmt(topFollowers),             icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Eng. promedio",      value: `${avgEng}%`,                  icon: Flame,      color: "text-orange-400", bg: "bg-orange-500/10" },
          ].map(s => (
            <Card key={s.label} className="glass border-white/[0.07]">
              <CardContent className="p-5">
                <div className={`size-8 rounded-xl ${s.bg} ${s.color} flex items-center justify-center mb-3`}>
                  <s.icon className="size-4" />
                </div>
                <div className="text-2xl font-black tracking-tighter text-white">{s.value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="size-10 animate-spin text-emerald-400" />
          <p className="text-sm text-muted-foreground/60 font-medium">Analizando creadores de TikTok...</p>
        </div>
      )}

      {/* ── Competitor cards ── */}
      {!loading && competitors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            {competitors.length} creador{competitors.length > 1 ? "es" : ""} en seguimiento
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {competitors.map((c, i) => (
              <Card
                key={c.id}
                className={`glass border-white/[0.07] overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer relative ${c.isManual ? "border-emerald-500/15" : ""}`}
                onClick={() => setSelectedCompetitor(c)}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header: rank + manual badge */}
                  <div className="flex items-start gap-3">
                    <div className={`size-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                      c.isManual
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-violet-500/10 border border-violet-500/20 text-violet-400"
                    }`}>
                      {c.isManual ? <BookmarkPlus className="size-4" /> : `#${i + 1}`}
                    </div>
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.handle} className="size-11 rounded-xl object-cover border border-white/10 shrink-0" />
                    ) : (
                      <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white text-sm truncate" style={{ fontFamily: "var(--font-syne)" }}>{c.name}</span>
                        {c.verified && <BadgeCheck className="size-3.5 text-blue-400 shrink-0" />}
                        {c.isManual && <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400 px-1 py-0 font-black">Manual</Badge>}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">{c.handle}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Followers", value: fmt(c.followers), icon: Users },
                      { label: "Likes",     value: fmt(c.likes),     icon: Heart },
                      { label: "Videos",    value: fmt(c.posts),     icon: FileText },
                    ].map(s => (
                      <div key={s.label} className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                        <div className="text-base font-black text-white tracking-tight">{s.value}</div>
                        <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Engagement bar */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Engagement</span>
                    <Badge variant="outline" className="glass-sm border-emerald-500/30 text-emerald-400 font-black text-[10px] px-2">
                      {c.engagement}%
                    </Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-1000"
                      style={{ width: `${Math.min(c.engagement, 100)}%` }}
                    />
                  </div>

                  {/* Bio */}
                  {c.bio && (
                    <p className="text-[11px] text-muted-foreground/50 line-clamp-2 font-medium italic border-t border-white/5 pt-3">
                      {c.bio}
                    </p>
                  )}

                  {/* ── Top 5 Videos Virales ── */}
                  {c.topVideos && c.topVideos.length > 0 && (
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-1.5">
                        <Play className="size-2.5" /> Top {c.topVideos.length} vídeos virales
                      </p>
                      <div className="space-y-1.5">
                        {c.topVideos.map((v, vi) => (
                          <div key={v.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.025] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                            {/* Thumbnail */}
                            <div className="relative size-10 rounded-lg overflow-hidden shrink-0 bg-black/40">
                              {v.thumbnail ? (
                                <img
                                  src={v.thumbnail}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              ) : null}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[9px] font-black text-white/50">#{vi + 1}</span>
                              </div>
                            </div>
                            {/* Stats */}
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-muted-foreground/60 truncate leading-snug mb-1">
                                {v.description?.replace(/#\w+/g, '').trim().slice(0, 50) || `Vídeo #${vi + 1}`}
                              </p>
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

                  {/* Alert button */}
                  <div className="border-t border-white/5 pt-3 space-y-2">
                    {(() => {
                      const existingAlert = getAlertForCompetitor(c.handle)
                      return (
                        <>
                          <button
                            onClick={() => setShowAlertForm(showAlertForm === c.id ? null : c.id)}
                            className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${
                              existingAlert
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'text-muted-foreground/30 hover:text-amber-400/70 hover:bg-amber-500/5'
                            }`}
                          >
                            {existingAlert ? <BellRing className="size-3" /> : <Bell className="size-3" />}
                            {existingAlert
                              ? `Alerta: >${Number(existingAlert.threshold).toLocaleString()}${existingAlert.type === 'engagement' ? '%' : ''}`
                              : 'Configurar alerta'}
                          </button>
                          {showAlertForm === c.id && (
                            <div className="space-y-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                              <div className="flex gap-2">
                                <select
                                  value={alertType}
                                  onChange={e => setAlertType(e.target.value as 'followers' | 'engagement')}
                                  className="flex-1 h-8 rounded-lg glass border border-white/10 px-2 text-xs font-bold text-white bg-transparent outline-none"
                                >
                                  <option value="followers" className="bg-gray-900">Seguidores</option>
                                  <option value="engagement" className="bg-gray-900">Engagement %</option>
                                </select>
                                <input
                                  type="number"
                                  placeholder={alertType === 'engagement' ? '5' : '10000'}
                                  value={alertThreshold}
                                  onChange={e => setAlertThreshold(e.target.value)}
                                  className="flex-1 h-8 rounded-lg glass border border-white/10 px-2 text-xs font-bold text-white bg-transparent outline-none"
                                />
                              </div>
                              <button
                                onClick={() => handleAddAlert(c.handle)}
                                disabled={savingAlert || !alertThreshold}
                                className="w-full text-[10px] font-black uppercase py-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                              >
                                {savingAlert ? 'Guardando...' : 'Guardar alerta'}
                              </button>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* Delete button (only for manual competitors) */}
                  {c.isManual && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteManual(c.id) }}
                      className={`w-full text-[10px] font-black uppercase tracking-widest py-1.5 rounded-lg transition-all ${
                        confirmDeleteId === c.id
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'text-muted-foreground/30 hover:text-red-400/60 hover:bg-red-500/5'
                      }`}
                    >
                      <Trash2 className="size-3 inline mr-1" />
                      {confirmDeleteId === c.id ? '¿Confirmar borrado?' : 'Eliminar'}
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && competitors.length === 0 && (
        <Card className="glass border-white/[0.07] border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="size-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>Sin resultados aún</h3>
              <p className="text-sm text-muted-foreground/60 max-w-xs font-medium">
                Añade competidores manualmente por @handle o busca un nicho específico.
              </p>
            </div>
            <Button onClick={() => fetchCompetitors()} className="bg-emerald-600 hover:bg-emerald-500 font-bold rounded-full px-7 h-11">
              <RefreshCcw className="mr-2 size-4" /> Analizar ahora
            </Button>
          </CardContent>
        </Card>
      )}
    </div>

    {/* ── Competitor Detail Drawer ── */}
    {selectedCompetitor && (() => {
      const comp = selectedCompetitor
      return (
        <>

        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setSelectedCompetitor(null)}
        />
        {/* Drawer panel */}
        <div className="fixed right-0 top-0 h-full w-full max-w-lg z-50 overflow-y-auto bg-[#0d0d14] border-l border-white/[0.07] shadow-2xl">
          <div className="p-6 space-y-6">
            {/* Close button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">Perfil competidor</span>
              <button
                onClick={() => setSelectedCompetitor(null)}
                className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="size-4 text-white/60" />
              </button>
            </div>

            {/* Profile header */}
            <div className="flex items-center gap-4">
              {selectedCompetitor.avatar ? (
                <img src={selectedCompetitor.avatar} alt="" referrerPolicy="no-referrer" className="size-16 rounded-2xl object-cover border border-white/10" />
              ) : (
                <div className="size-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-black">
                  {selectedCompetitor.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-black text-white truncate" style={{ fontFamily: 'var(--font-syne)' }}>{selectedCompetitor.name}</h2>
                  {selectedCompetitor.verified && <BadgeCheck className="size-5 text-blue-400 shrink-0" />}
                </div>
                <p className="text-sm font-bold text-emerald-400">{selectedCompetitor.handle}</p>
                {selectedCompetitor.bio && <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">{selectedCompetitor.bio}</p>}
              </div>
            </div>

            {/* Main stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Seguidores', value: fmt(selectedCompetitor.followers), color: 'text-emerald-400', icon: Users },
                { label: 'Likes totales', value: fmt(selectedCompetitor.likes), color: 'text-pink-400', icon: Heart },
                { label: 'Vídeos', value: fmt(selectedCompetitor.posts), color: 'text-violet-400', icon: FileText },
                { label: 'Engagement', value: `${selectedCompetitor.engagement}%`, color: 'text-orange-400', icon: Flame },
              ].map(s => (
                <div key={s.label} className="p-4 rounded-2xl glass border border-white/[0.07] flex items-center gap-3">
                  <s.icon className={`size-5 ${s.color} shrink-0`} />
                  <div>
                    <div className="text-lg font-black text-white">{s.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Real views from top 5 viral videos */}
            {selectedCompetitor.topVideos && selectedCompetitor.topVideos.length > 0 && (() => {
              const totalRealViews = selectedCompetitor.topVideos!.reduce((s, v) => s + v.views, 0)
              const avgViews = Math.round(totalRealViews / selectedCompetitor.topVideos!.length)
              const topView = selectedCompetitor.topVideos![0]?.views ?? 0
              return (
                <div className="p-4 rounded-2xl bg-pink-500/10 border border-pink-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-pink-400/70 mb-1">Vistas reales · Top 5 vídeos</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-white">{fmt(totalRealViews)}</span>
                    <span className="text-xs text-pink-400 font-bold">vistas en total</span>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <p className="text-[10px] text-muted-foreground/50">🏆 Más viral: {fmt(topView)} vistas</p>
                    <p className="text-[10px] text-muted-foreground/50">∅ Media: {fmt(avgViews)}/vídeo</p>
                  </div>
                </div>
              )
            })()}

            {/* Top 5 viral videos */}
            {selectedCompetitor.topVideos && selectedCompetitor.topVideos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-2">
                  <Play className="size-3" /> Top {selectedCompetitor.topVideos.length} Vídeos con más vistas
                </h3>
                {selectedCompetitor.topVideos.map((v, vi) => {
                  const videoUrl = v.id && !v.id.startsWith('post-')
                    ? `https://www.tiktok.com/@${comp.handle.replace(/^@/, '')}/video/${v.id}`
                    : null
                  return (
                    <a
                      key={v.id}
                      href={videoUrl ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex gap-3 p-3 rounded-2xl glass border border-white/[0.06] hover:border-white/[0.12] transition-colors group ${videoUrl ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={e => !videoUrl && e.preventDefault()}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-black/40">
                        {v.thumbnail ? (
                          <img
                            src={v.thumbnail}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-end justify-start p-1">
                          <span className="text-[9px] font-black bg-black/70 text-white/80 rounded-md px-1.5 py-0.5">#{vi + 1}</span>
                        </div>
                        {videoUrl && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <span className="text-[9px] font-black text-white">Ver ↗</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <p className="text-[11px] text-muted-foreground/70 leading-snug line-clamp-3">
                          {v.description?.replace(/#\w+/g, '').trim() || `Vídeo #${vi + 1}`}
                        </p>
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
