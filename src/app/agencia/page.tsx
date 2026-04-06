"use client"


import { useT } from "@/i18n"
import * as React from "react"
import { Building2, Download, Users, LineChart, Trash2, RefreshCcw, Loader2, Plus, BadgeCheck, X, CheckCircle2, AlertCircle, Upload } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

type Client = {
  id: string; handle: string; followers: number; likes: number
  posts: number; engagement: number; avatar: string; verified: boolean
  lastSync: string; bio: string; views: number; agencyNote: string
}

export default function AgenciaPage() {
  const t = useT()
  const [agencyName] = React.useState("My Agency")
  const [agencyLocation] = React.useState("New York, USA")
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)
  const [adding, setAdding] = React.useState(false)
  const [newHandle, setNewHandle] = React.useState("")
  const [addError, setAddError] = React.useState<string | null>(null)
  const [syncingId, setSyncingId] = React.useState<string | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [bulkText, setBulkText] = React.useState("")
  const [bulkLoading, setBulkLoading] = React.useState(false)
  const [bulkResults, setBulkResults] = React.useState<{handle:string;ok:boolean;error?:string}[]>([])

  React.useEffect(() => {
    fetch("/api/agency").then(r => r.json()).then(d => { setClients(d.clients || []); setLoading(false) })
  }, [])

  const handleAdd = async () => {
    if (!newHandle.trim() || adding) return
    setAdding(true); setAddError(null)
    const res = await fetch("/api/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add-client", payload: { handle: newHandle.trim() } }) })
    const data = await res.json()
    if (res.ok) { setClients(data.clients); setNewHandle("") } else setAddError(data.error ?? "Error adding client")
    setAdding(false)
  }

  const handleBulkImport = async () => {
    const handles = bulkText.split(/[\n,;]+/).map(h => h.trim().replace(/^@/, "")).filter(h => h.length > 1)
    if (!handles.length) return
    setBulkLoading(true); setBulkResults([])
    const res = await fetch("/api/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bulk-add-clients", payload: { handles } }) })
    const data = await res.json()
    if (res.ok) { setClients(data.clients); setBulkResults(data.results) }
    setBulkLoading(false)
  }

  const handleSync = async (id: string) => {
    setSyncingId(id)
    const res = await fetch("/api/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync-client", payload: { id } }) })
    const data = await res.json()
    if (res.ok) setClients(data.clients)
    setSyncingId(null)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const res = await fetch("/api/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-client", payload: { id } }) })
    const data = await res.json()
    if (res.ok) setClients(data.clients)
    setDeletingId(null)
  }

  const handlePrint = () => window.print()
  const totalFollowers = clients.reduce((a, c) => a + (c.followers || 0), 0)
  const totalViews = clients.reduce((a, c) => a + (c.views || Math.round((c.likes || 0) / 0.03)), 0)
  const totalLikes = clients.reduce((a, c) => a + (c.likes || 0), 0)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print-hidden">
        <div>
          <div className="section-pill bg-indigo-500/10 text-indigo-400 border-indigo-500/20 mb-3">
            <Building2 className="size-3" /> B2B Agency Portal
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Client <span style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Management</span>
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">Accounts independent from the main workspace.</p>
        </div>
        <Button onClick={handlePrint} className="bg-white text-black hover:bg-white/90 font-black rounded-xl h-11 px-6 flex gap-2 w-full md:w-auto print-hidden">
          <Download className="size-4" /> Export PDF
        </Button>
      </div>

      <Card className="glass border-white/[0.07] print-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Plus className="size-4 text-indigo-400" /> Add Clients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input placeholder="@TikTok handle..." value={newHandle} onChange={e => { setNewHandle(e.target.value); setAddError(null) }} onKeyDown={e => e.key === "Enter" && handleAdd()} className="glass border-white/10 bg-transparent font-mono" disabled={adding} />
            <Button onClick={handleAdd} disabled={adding || !newHandle.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shrink-0 px-5">
              {adding ? <Loader2 className="size-4 animate-spin" /> : "Add"}
            </Button>
            <Button onClick={() => setBulkOpen(v => !v)} variant="outline" className="glass border-white/10 font-bold rounded-xl shrink-0 gap-1.5 hidden sm:flex">
              <Upload className="size-3.5" /> Bulk import
            </Button>
          </div>
          {addError && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3"><AlertCircle className="size-3.5 shrink-0" /> {addError}</div>}
          {bulkOpen && (
            <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
              <p className="text-xs font-bold text-muted-foreground/70">Paste handles separated by line breaks, commas or semicolons (max 20):</p>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder={"@account1\n@account2\n@account3"} className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-sm font-mono text-white resize-none outline-none focus:border-indigo-500/50" />
              <div className="flex gap-3">
                <Button onClick={handleBulkImport} disabled={bulkLoading || !bulkText.trim()} className="bg-indigo-600 hover:bg-indigo-500 font-black rounded-xl flex gap-2">
                  {bulkLoading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  {bulkLoading ? t.agency_importing : t.agency_import}
                </Button>
                <Button variant="ghost" onClick={() => { setBulkOpen(false); setBulkResults([]) }} className="text-muted-foreground/60 rounded-xl">Cancel</Button>
              </div>
              {bulkResults.length > 0 && (
                <div className="space-y-1 mt-2">
                  {bulkResults.map((r, i) => (
                    <div key={i} className={`flex items-center gap-2 text-xs font-bold ${r.ok ? "text-emerald-400" : "text-red-400"}`}>
                      {r.ok ? <CheckCircle2 className="size-3" /> : <X className="size-3" />}
                      {r.handle} {!r.ok && `— ${r.error}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-indigo-400" /></div>
      ) : clients.length === 0 ? (
        <Card className="glass border-white/[0.07] border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground/50">
            <Building2 className="size-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No clients yet.<br/>Add their @handles above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 print-hidden">
            {[
              { l: t.agency_clients,        v: clients.length,       i: Users,     c: "text-indigo-400",  bg: "bg-indigo-500/10" },
              { l: t.agency_audience, v: fmt(totalFollowers),  i: Users,     c: "text-emerald-400", bg: "bg-emerald-500/10" },
              { l: "Est. Views",     v: fmt(totalViews),      i: LineChart, c: "text-pink-400",    bg: "bg-pink-500/10" },
            ].map((s, i) => (
              <Card key={i} className="glass border-white/[0.07]">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`size-9 rounded-xl ${s.bg} ${s.c} flex items-center justify-center`}><s.i className="size-4" /></div>
                  <div><div className="text-xl font-black text-white">{s.v}</div><div className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/50">{s.l}</div></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="space-y-3">
            {clients.sort((a, b) => b.followers - a.followers).map(client => (
              <Card key={client.id} className="glass border-white/[0.07] hover:bg-white/[0.02] transition-colors">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      {client.avatar ? <img src={client.avatar} alt={client.handle} className="size-12 rounded-xl object-cover shrink-0" /> : <div className="size-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-lg shrink-0">@</div>}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-black text-white">{client.handle}</h3>
                          {client.verified && <BadgeCheck className="size-4 text-blue-400" />}
                        </div>
                        {client.bio && <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-0.5">{client.bio}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      {[
                        { l: "Followers", v: fmt(client.followers), c: "text-emerald-400" },
                        { l: "Likes",     v: fmt(client.likes || 0), c: "text-pink-400" },
                        { l: "Eng.",      v: `${client.engagement}%`, c: "text-violet-400" },
                        { l: "Views",     v: fmt(client.views || 0), c: "text-blue-400" },
                      ].map((s, i) => (
                        <div key={i} className="text-center hidden sm:block">
                          <p className="text-xs font-black text-muted-foreground/50 uppercase">{s.l}</p>
                          <p className={`text-sm font-black ${s.c}`}>{s.v}</p>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5 ml-2 print-hidden">
                        <Button variant="ghost" size="icon" onClick={() => handleSync(client.id)} disabled={syncingId === client.id} className="size-8 rounded-lg hover:bg-white/10 text-muted-foreground/60 hover:text-white">
                          {syncingId === client.id ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCcw className="size-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} disabled={deletingId === client.id} className="size-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-muted-foreground/60">
                          {deletingId === client.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="print-area hidden print:block p-8 bg-black min-h-screen">
        <div className="flex justify-between items-end border-b border-white/20 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">{agencyName}</h1>
            <p className="text-muted-foreground/60 mt-1">{agencyLocation}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground/50">
            <p className="font-bold text-indigo-400">Portfolio Report</p>
            <p>{new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[[t.agency_clients, clients.length], ["Audience", fmt(totalFollowers)], ["Likes", fmt(totalLikes)]].map(([l, v], i) => (
            <div key={i} className="p-4 border border-white/10 rounded-xl text-center">
              <div className="text-2xl font-black text-white">{v}</div>
              <div className="text-[9px] uppercase font-bold text-muted-foreground/50">{l}</div>
            </div>
          ))}
        </div>
        {clients.sort((a, b) => b.followers - a.followers).map(c => (
          <div key={c.id} className="flex justify-between items-center p-4 border-b border-white/10">
            <div>
              <p className="font-black text-white">{c.handle}</p>
              {c.agencyNote && <p className="text-xs text-muted-foreground/50">{c.agencyNote}</p>}
            </div>
            <div className="flex gap-8 text-right">
              <div><p className="text-[9px] text-muted-foreground/50 uppercase">Followers</p><p className="font-black text-white">{c.followers.toLocaleString()}</p></div>
              <div><p className="text-[9px] text-muted-foreground/50 uppercase">Engagement</p><p className="font-black text-indigo-400">{c.engagement}%</p></div>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{__html:`
        @media print {
          .print-hidden { display: none !important; }
          .print-area { display: block !important; }
          body > * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}} />
    </div>
  )
}
