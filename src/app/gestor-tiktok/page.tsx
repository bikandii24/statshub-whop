"use client"

import * as React from "react"
import { Video, UserPlus, Trash2, RefreshCcw, BadgeCheck, AlertCircle, Loader2, KeyRound, Heart, FileText, Users, Flame, Clock, Wand2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useWorkspace } from "@/context/workspace-context"
import { useRouter } from "next/navigation"

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function GestorTiktokPage() {
  const router = useRouter()
  const { activeWorkspace, accounts, addAccount, syncAccount, deleteAccount, isLoading, apiConfigured } = useWorkspace()
  const [openAccModal, setOpenAccModal] = React.useState(false)
  const [newHandle, setNewHandle] = React.useState("")
  const [addingAccount, setAddingAccount] = React.useState(false)
  const addingRef = React.useRef(false)
  const [addError, setAddError] = React.useState<string | null>(null)
  const [syncingId, setSyncingId] = React.useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [aiLoading, setAiLoading] = React.useState(false)
  const [aiIdeas, setAiIdeas] = React.useState<{title:string, script:string}[]>([])
  const [aiSelectedAccount, setAiSelectedAccount] = React.useState("")
  const [aiNiche, setAiNiche] = React.useState("")

  const workspaceAccounts = accounts.filter(a => a.workspaceId === activeWorkspace?.id)
  const totalFollowers = workspaceAccounts.reduce((s, a) => s + a.followers, 0)
  const totalLikes = workspaceAccounts.reduce((s, a) => s + (a.likes ?? 0), 0)
  const totalPosts = workspaceAccounts.reduce((s, a) => s + a.posts, 0)
  const avgEngagement = workspaceAccounts.length > 0
    ? (workspaceAccounts.reduce((s, a) => s + a.engagement, 0) / workspaceAccounts.length).toFixed(2) : "0"

  const topStats = [
    { label: "Total Audience",   value: fmt(totalFollowers), icon: Users,    color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Total Likes",      value: fmt(totalLikes),     icon: Heart,    color: "text-pink-400",    bg: "bg-pink-500/10",    border: "border-pink-500/20" },
    { label: "Videos Published", value: fmt(totalPosts),     icon: FileText, color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
    { label: "Avg. Engagement",  value: `${avgEngagement}%`, icon: Flame,    color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/20" },
  ]

  const handleAddAccount = async () => {
    if (!newHandle || addingRef.current) return
    addingRef.current = true; setAddingAccount(true); setAddError(null)
    const handle = newHandle.startsWith("@") ? newHandle : `@${newHandle}`
    const result = await addAccount(handle)
    addingRef.current = false; setAddingAccount(false)
    if (result.success) { setNewHandle("") } else { setAddError(result.error ?? "Unknown error") }
  }

  const handleSync = async (id: string) => { setSyncingId(id); await syncAccount(id); setSyncingId(null) }
  const handleDelete = async (id: string) => {
    setDeletingId(id); await deleteAccount(id); setDeletingId(null); setConfirmDeleteId(null)
  }

  const handleGenerateIdeas = async () => {
    if (!aiSelectedAccount) return
    setAiLoading(true)
    const acc = workspaceAccounts.find(a => a.id === aiSelectedAccount)
    try {
      const res = await fetch("/api/ai-ideas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: acc?.handle, niche: aiNiche || "entertainment", engagement: acc?.engagement }) })
      const data = await res.json()
      if (res.ok && data.ideas) setAiIdeas(data.ideas)
    } catch (e) { console.error(e) } finally { setAiLoading(false) }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      {!apiConfigured && !isLoading && (
        <div className="flex items-start gap-4 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
          <KeyRound className="size-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-400">API configuration required</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Create a <code className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono">.env.local</code> file in the project root:</p>
            <pre className="mt-2 text-xs font-mono text-amber-300/80 bg-black/30 rounded-lg px-3 py-2">RAPIDAPI_KEY=your_key{"\n"}RAPIDAPI_HOST=tiktok-scraper7.p.rapidapi.com</pre>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="section-pill bg-pink-500/10 text-pink-400 border-pink-500/20 mb-3">
            <Video className="size-3" /> {activeWorkspace?.name || "TikTok"}
            {apiConfigured && <span className="ml-1.5 size-1.5 rounded-full bg-emerald-400 inline-block" />}
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            <span className="gradient-text-pink">TikTok</span> Statistics
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">Real metrics for your accounts · on-demand sync.</p>
        </div>

        <Dialog open={openAccModal} onOpenChange={setOpenAccModal}>
          <DialogTrigger className="inline-flex items-center justify-center font-bold rounded-full h-11 px-7 shadow-xl shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all bg-pink-600 hover:bg-pink-500 text-white text-sm w-full md:w-auto">
            <UserPlus className="mr-2 h-4 w-4" /> Add account
            {workspaceAccounts.length > 0 && <span className="ml-2 font-black text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{workspaceAccounts.length}</span>}
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-[440px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-black text-lg" style={{ fontFamily: "var(--font-syne)" }}>Manage Accounts</DialogTitle>
              <DialogDescription className="text-muted-foreground/70">Add TikTok handles to see their real stats.</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-3">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input placeholder="@username" value={newHandle} onChange={e => { setNewHandle(e.target.value); setAddError(null) }} onKeyDown={e => e.key === "Enter" && handleAddAccount()} className="glass border-white/10 rounded-xl font-mono" disabled={addingAccount} />
                  <Button onClick={handleAddAccount} disabled={addingAccount || !newHandle || !apiConfigured} className="bg-pink-600 hover:bg-pink-500 font-bold rounded-xl px-4 shrink-0">
                    {addingAccount ? <Loader2 className="size-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
                {addError && <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3"><AlertCircle className="size-3.5 shrink-0 mt-0.5" /><span>{addError}</span></div>}
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {workspaceAccounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group">
                    {acc.avatar ? <img src={acc.avatar} alt={acc.handle} className="size-9 rounded-lg object-cover shrink-0" /> : <div className="size-9 rounded-lg bg-pink-500/20 flex items-center justify-center font-bold text-xs text-pink-400 shrink-0">@</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white/90 flex items-center gap-1.5">{acc.handle}{acc.verified && <BadgeCheck className="size-3.5 text-blue-400" />}</p>
                      <p className="text-[10px] text-muted-foreground/50">{fmt(acc.followers)} followers</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleSync(acc.id)} disabled={syncingId === acc.id} className="size-8 rounded-lg hover:bg-white/10 text-muted-foreground/60 hover:text-white">
                        {syncingId === acc.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteAccount(acc.id)} className="size-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground/60"><Trash2 className="size-3.5" /></Button>
                    </div>
                  </div>
                ))}
                {workspaceAccounts.length === 0 && <p className="text-xs text-center py-6 text-muted-foreground/40 italic">Add your first @handle above.</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {topStats.map(s => (
          <Card key={s.label} className="glass border-white/[0.07] group hover:bg-white/[0.03] transition-colors">
            <CardContent className="p-5">
              <div className={`size-9 rounded-xl ${s.bg} ${s.color} flex items-center justify-center border ${s.border} mb-3 group-hover:scale-110 transition-transform`}><s.icon className="size-4" /></div>
              <div className="text-2xl sm:text-3xl font-black tracking-tighter text-white">{isLoading ? <Loader2 className="size-5 animate-spin text-muted-foreground/30" /> : s.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-0.5">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {workspaceAccounts.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40">Connected accounts</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {workspaceAccounts.sort((a, b) => b.followers - a.followers).map(acc => (
              <Card key={acc.id} className="glass border-white/[0.07] overflow-hidden group hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => router.push(`/cuenta/${acc.id}`)}>
                <CardHeader className="p-5 pb-4">
                  <div className="flex items-start gap-3">
                    {acc.avatar ? <img src={acc.avatar} alt={acc.handle} className="size-12 rounded-xl object-cover shrink-0 border border-white/10" /> : <div className="size-12 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center text-lg font-black shrink-0">@</div>}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-black text-white text-base truncate" style={{ fontFamily: "var(--font-syne)" }}>{acc.handle}</h3>
                        {acc.verified && <BadgeCheck className="size-4 text-blue-400 shrink-0" />}
                      </div>
                      {acc.bio && <p className="text-[11px] text-muted-foreground/60 font-medium line-clamp-2 mt-0.5">{acc.bio}</p>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: "Followers", value: fmt(acc.followers) }, { label: "Likes", value: fmt(acc.likes ?? 0) }, { label: "Videos", value: fmt(acc.posts) }].map(s => (
                      <div key={s.label} className="text-center p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                        <div className="text-base sm:text-lg font-black text-white tracking-tighter">{s.value}</div>
                        <div className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Eng. Rate</span>
                      <Badge variant="outline" className="glass-sm border-violet-500/30 text-violet-400 font-black text-[10px] px-2">{acc.engagement}%</Badge>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-1000" style={{ width: `${Math.min(acc.engagement, 100)}%` }} /></div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/40 font-medium"><Clock className="size-3" />Sync {timeAgo(acc.lastSync)}</div>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {confirmDeleteId === acc.id ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                          <span className="text-[10px] font-bold text-red-400">Delete?</span>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} className="h-6 px-2 rounded-lg text-[10px] font-bold text-muted-foreground/60 hover:text-white hover:bg-white/10">Cancel</Button>
                          <Button size="sm" onClick={() => handleDelete(acc.id)} disabled={deletingId === acc.id} className="h-6 px-2 rounded-lg text-[10px] font-bold bg-red-600 hover:bg-red-500 text-white">{deletingId === acc.id ? <Loader2 className="size-3 animate-spin" /> : "Delete"}</Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(acc.id)} className="h-7 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400/50 hover:text-red-400 hover:bg-red-500/10 gap-1"><Trash2 className="size-3" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleSync(acc.id)} disabled={syncingId === acc.id} className="h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 hover:text-white hover:bg-white/10 gap-1.5">
                            {syncingId === acc.id ? <Loader2 className="size-3 animate-spin" /> : <RefreshCcw className="size-3" />}Refresh
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="glass border-white/[0.07] border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="size-16 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center border border-pink-500/20"><Video className="size-8" /></div>
            <div>
              <h3 className="text-lg font-black text-white mb-1" style={{ fontFamily: "var(--font-syne)" }}>No connected accounts</h3>
              <p className="text-sm text-muted-foreground/60 font-medium max-w-xs">Add your TikTok handles to see their real-time stats.</p>
            </div>
            <Button onClick={() => setOpenAccModal(true)} className="bg-pink-600 hover:bg-pink-500 font-bold rounded-full px-7 h-11 mt-2" disabled={!apiConfigured}><UserPlus className="mr-2 size-4" /> Add first account</Button>
          </CardContent>
        </Card>
      )}

      {workspaceAccounts.length > 0 && (
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20"><Wand2 className="size-5 text-white" /></div>
            <div>
              <h2 className="text-xl font-black text-white" style={{ fontFamily: "var(--font-syne)" }}>AI Copilot</h2>
              <p className="text-xs text-muted-foreground/60">Hooks and scripts generated by AI.</p>
            </div>
          </div>
          <Card className="glass border-white/[0.07] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4 md:col-span-1">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 block">Account to Analyze</label>
                    <select value={aiSelectedAccount} onChange={e => setAiSelectedAccount(e.target.value)} className="w-full h-10 rounded-xl glass border border-white/[0.07] px-3 text-sm font-bold text-white bg-transparent outline-none focus:border-violet-500/50 cursor-pointer">
                      <option value="" className="bg-gray-900">Select account...</option>
                      {workspaceAccounts.map(a => <option key={a.id} value={a.id} className="bg-gray-900">{a.handle}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 block">Niche / Style Context</label>
                    <Input placeholder="e.g. Entrepreneurship, Storytelling..." value={aiNiche} onChange={e => setAiNiche(e.target.value)} className="glass border-white/10 rounded-xl bg-transparent" />
                  </div>
                  <Button onClick={handleGenerateIdeas} disabled={!aiSelectedAccount || aiLoading} className="w-full h-11 rounded-xl bg-white text-black hover:bg-white/90 font-black text-sm flex gap-2 transition-all">
                    {aiLoading ? <Loader2 className="size-4 animate-spin text-black/50" /> : <Sparkles className="size-4" />}Generate 3 Viral Ideas
                  </Button>
                </div>
                <div className="md:col-span-2 space-y-3">
                  {aiIdeas.length === 0 ? (
                    <div className="h-full min-h-[160px] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 text-muted-foreground/40">
                      <Wand2 className="size-6 mb-2 opacity-50" />
                      <p className="text-sm font-medium">Select an account and generate ideas<br/>to break through creative blocks.</p>
                    </div>
                  ) : aiIdeas.map((idea, i) => (
                    <div key={i} className="glass border border-white/5 rounded-2xl p-4 hover:border-violet-500/20 transition-colors relative overflow-hidden bg-white/[0.02]">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-violet-500 to-fuchsia-500 opacity-50" />
                      <div className="flex gap-4">
                        <div className="size-8 rounded-full bg-violet-500/10 text-violet-400 font-black flex items-center justify-center shrink-0 border border-violet-500/20 text-xs">{i+1}</div>
                        <div><h4 className="text-sm font-black text-white leading-tight mb-1">{idea.title}</h4><p className="text-xs text-muted-foreground/70 leading-relaxed font-medium">{idea.script}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
