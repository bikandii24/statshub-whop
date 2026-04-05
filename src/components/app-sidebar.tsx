"use client"

import * as React from "react"
import {
  BarChart3, TrendingUp, Video, Zap, Settings, ChevronRight, Plus,
  ChevronsUpDown, LogOut, Folder, LayoutDashboard, Newspaper, Pencil, Check, X, Trash2,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useWorkspace } from "@/context/workspace-context"

const navMain = [
  { title: "Dashboard",     url: "/",              icon: LayoutDashboard, color: "text-violet-400", activeColor: "bg-violet-500/15 text-violet-400 border-violet-500/25", hoverColor: "hover:bg-violet-500/5 hover:text-violet-300", glowColor: "rgba(139,92,246,0.8)" },
  { title: "Gestor TikTok", url: "/gestor-tiktok", icon: Video,           color: "text-pink-400",   activeColor: "bg-pink-500/15 text-pink-400 border-pink-500/25",       hoverColor: "hover:bg-pink-500/5 hover:text-pink-300",     glowColor: "rgba(236,72,153,0.8)" },
]

const navAnalytics = [
  { title: "Analítica",   url: "/analitica",               icon: BarChart3,  color: "text-blue-400",    activeColor: "bg-blue-500/15 text-blue-400 border-blue-500/25",       hoverColor: "hover:bg-blue-500/5 hover:text-blue-300",     glowColor: "rgba(59,130,246,0.8)" },
  { title: "Competencia", url: "/seguimiento-competencia", icon: TrendingUp, color: "text-emerald-400", activeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", hoverColor: "hover:bg-emerald-500/5 hover:text-emerald-300", glowColor: "rgba(16,185,129,0.8)" },
  { title: "Noticias",    url: "/consolidado-noticias",    icon: Newspaper,  color: "text-amber-400",   activeColor: "bg-amber-500/15 text-amber-400 border-amber-500/25",   hoverColor: "hover:bg-amber-500/5 hover:text-amber-300",   glowColor: "rgba(245,158,11,0.8)", badge: "3" },
  { title: "Agencias (B2B)",url: "/agencia",                 icon: Folder,     color: "text-indigo-400",  activeColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25", hoverColor: "hover:bg-indigo-500/5 hover:text-indigo-300", glowColor: "rgba(99,102,241,0.8)" },
]

const iconMap: Record<string, any> = {
  Zap, Folder
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, workspaces, activeWorkspace, setActiveWorkspace, addWorkspace, renameWorkspace, deleteWorkspace, isLoading, logout } = useWorkspace()
  const [wsOpen, setWsOpen] = React.useState(false)
  const [addingWs, setAddingWs] = React.useState(false)
  const [newWsName, setNewWsName] = React.useState("")
  const [renamingId, setRenamingId] = React.useState<string | null>(null)
  const [renameVal, setRenameVal] = React.useState("")
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const wsRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
        setWsOpen(false)
        setAddingWs(false)
      }
    }
    if (wsOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wsOpen])

  const renderNavItem = (item: typeof navMain[0]) => {
    const isActive = pathname === item.url
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          tooltip={item.title}
          isActive={isActive}
          className={`h-11 rounded-xl transition-all duration-300 relative border
            ${isActive
              ? `${item.activeColor} shadow-[0_0_20px_-8px_var(--item-glow)]`
              : `border-transparent text-muted-foreground ${item.hoverColor}`
            }`}
          style={{ '--item-glow': item.glowColor } as React.CSSProperties}
          render={
            <Link href={item.url} className="flex items-center gap-3 w-full">
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
                  style={{ background: item.glowColor, boxShadow: `0 0 12px 3px ${item.glowColor}` }}
                />
              )}
              <item.icon className={`size-4.5 transition-all duration-300 ${isActive ? item.color : ""} ${isActive ? "scale-110" : ""}`} />
              <span className={`font-semibold text-sm tracking-tight ${isActive ? "font-bold" : ""}`}>
                {item.title}
              </span>
            </Link>
          }
        />
        {(item as any).badge && (
          <SidebarMenuBadge className="bg-amber-500 text-black font-black text-[9px] px-1.5 rounded-full">
            {(item as any).badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    )
  }

  const ActiveIcon = activeWorkspace ? iconMap[activeWorkspace.icon] || Zap : Zap

  const handleAddWorkspace = async () => {
    if (!newWsName.trim()) return
    await addWorkspace(newWsName.trim())
    setNewWsName("")
    setAddingWs(false)
  }

  const startRename = (ws: any) => {
    setRenamingId(ws.id)
    setRenameVal(ws.name)
  }
  const confirmRename = async () => {
    if (renamingId && renameVal.trim()) await renameWorkspace(renamingId, renameVal)
    setRenamingId(null)
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? "?"

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-white/5"
      style={{ background: "oklch(0.09 0.018 260 / 0.95)" }}
    >
      {/* ── HEADER ── */}
      <SidebarHeader className="pt-6 pb-4 px-4">
        {/* Workspace Switcher — custom dropdown (reliable on all browsers) */}
        <div ref={wsRef} className="relative">
          <button
            onClick={() => { setWsOpen(o => !o); setAddingWs(false) }}
            className="flex w-full items-center gap-2 overflow-hidden h-14 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 cursor-pointer hover:bg-white/[0.04] transition-all duration-200 select-none text-left"
          >
            <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 shrink-0">
              <ActiveIcon className="size-5 text-white" />
            </div>
            <div className="grid flex-1 text-left leading-tight ml-1 overflow-hidden">
              <span className="truncate font-black text-sm tracking-tighter text-white" style={{ fontFamily: "var(--font-syne)" }}>
                {isLoading ? "Cargando..." : activeWorkspace?.name || "Mi Espacio"}
              </span>
              <span className="truncate text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                Workspace activo
              </span>
            </div>
            <ChevronsUpDown className={`ml-auto size-4 text-muted-foreground/30 shrink-0 transition-transform duration-200 ${wsOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown panel */}
          {wsOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl glass border border-white/10 shadow-2xl shadow-black/40 z-[100] overflow-hidden">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                Mis Workspaces
              </div>
              <div className="h-px bg-white/5 mx-2 mb-1" />
              <div className="max-h-48 overflow-y-auto">
                {workspaces.map((ws) => {
                  const Icon = iconMap[ws.icon] || Zap
                  const isActive = activeWorkspace?.id === ws.id
                  const isRenaming = renamingId === ws.id
                  return (
                    <div key={ws.id} className={`flex items-center gap-2 px-3 py-2 group transition-all ${isActive ? "bg-white/5" : "hover:bg-white/5"}`}>
                      <button
                        onClick={() => { setActiveWorkspace(ws); setWsOpen(false) }}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <div className={`flex size-7 items-center justify-center rounded-lg bg-white/5 border border-white/10 ${ws.color} shrink-0`}>
                          <Icon className="size-3.5" />
                        </div>
                        {isRenaming ? (
                          <input
                            autoFocus
                            value={renameVal}
                            onChange={e => setRenameVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                            onClick={e => e.stopPropagation()}
                            className="flex-1 min-w-0 text-xs font-bold bg-white/10 border border-white/20 rounded-md px-2 py-0.5 text-white outline-none focus:border-violet-500/50"
                          />
                        ) : (
                          <span className="font-bold text-sm text-white/90 flex-1 truncate">{ws.name}</span>
                        )}
                        {isActive && !isRenaming && <div className="size-1.5 rounded-full bg-violet-400 shrink-0" />}
                      </button>
                      {/* Action buttons */}
                      {isRenaming ? (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={confirmRename} className="size-5 flex items-center justify-center rounded text-emerald-400 hover:bg-emerald-500/10">
                            <Check className="size-3" />
                          </button>
                          <button onClick={() => setRenamingId(null)} className="size-5 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10">
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                          {/* Rename */}
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(null); startRename(ws) }}
                            className="size-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-white/60 hover:bg-white/10 transition-all"
                          >
                            <Pencil className="size-3" />
                          </button>
                          {/* Delete — only if >1 workspace, requires confirm */}
                          {workspaces.length > 1 && (
                            confirmDeleteId === ws.id ? (
                              <button
                                onClick={async e => { e.stopPropagation(); await deleteWorkspace(ws.id); setConfirmDeleteId(null) }}
                                title="Confirmar borrado"
                                className="size-5 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                              >
                                <Check className="size-3" />
                              </button>
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); setConfirmDeleteId(ws.id) }}
                                title="Borrar espacio"
                                className="size-5 flex items-center justify-center rounded text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="h-px bg-white/5 mx-2 mt-1" />
              {addingWs ? (
                <div className="px-3 py-2 flex gap-2">
                  <input
                    autoFocus
                    placeholder="Nombre del espacio"
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleAddWorkspace()
                      if (e.key === "Escape") setAddingWs(false)
                    }}
                    className="flex-1 text-xs font-medium bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-violet-500/50"
                  />
                  <button onClick={handleAddWorkspace} className="text-[10px] font-black text-violet-400 hover:text-violet-300 px-2">OK</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingWs(true)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-all text-muted-foreground/60"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                    <Plus className="size-4" />
                  </div>
                  <span className="font-bold text-sm">Añadir espacio</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="mt-5 flex items-center gap-3 px-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-lg shrink-0">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{user?.name ?? "Usuario"}</div>
            <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest truncate">{user?.email ?? ""}</div>
          </div>
          <button onClick={logout} title="Cerrar sesión" className="text-muted-foreground/30 hover:text-red-400 transition-colors shrink-0">
            <LogOut className="size-3.5" />
          </button>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="bg-white/[0.05] mx-4" />

      {/* ── CONTENT ── */}
      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 px-2 mb-1">Principal</SidebarGroupLabel>
          <SidebarMenu className="gap-1">{navMain.map(renderNavItem)}</SidebarMenu>
        </SidebarGroup>

        <div className="my-3 h-px bg-white/[0.05] mx-2" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30 px-2 mb-1">Análisis</SidebarGroupLabel>
          <SidebarMenu className="gap-1">{navAnalytics.map(renderNavItem)}</SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="bg-white/[0.05] mx-4" />

      {/* ── FOOTER ── */}
      <SidebarFooter className="py-4 px-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-11 rounded-xl hover:bg-white/5 transition-all group border border-transparent"
              render={
                <Link href="/configuracion" className="flex items-center gap-3 w-full">
                  <Settings className="size-4.5 text-muted-foreground/50 group-hover:rotate-90 transition-transform duration-500" />
                  <span className="font-semibold text-sm text-muted-foreground/60 group-hover:text-white transition-colors tracking-tight">
                    Configuración
                  </span>
                  <ChevronRight className="size-3.5 text-muted-foreground/30 ml-auto group-hover:translate-x-0.5 transition-transform" />
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Branding */}
        <div className="mt-3 px-2 py-2 flex items-center gap-2">
          <BarChart3 className="size-3.5 text-violet-400/50" />
          <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest">Stats Hub</span>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
