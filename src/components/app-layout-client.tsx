"use client"

import * as React from "react"
import ReactDOM from "react-dom"
import { useRouter, usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { WorkspaceProvider, useWorkspace } from "@/context/workspace-context"
import { BarChart3, Loader2, Bell, BellRing, CheckCircle2, AlertCircle, Gem, X } from "lucide-react"

// Inner guard — needs to be inside WorkspaceProvider to access context
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading } = useWorkspace()
  const router = useRouter()

  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/login")
    }
  }, [user, isAuthLoading, router])

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "oklch(0.07 0.018 260)" }}>
        <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <BarChart3 className="size-7 text-white" />
        </div>
        <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (!user) return null
  return <>{children}</>
}

function PricingModal({ onClose }: { onClose: () => void }) {
  const plans = [
    {
      name: "Beta",
      price: "Gratis",
      period: "",
      badge: "Plan actual",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      gradient: "from-emerald-500/20 to-transparent",
      border: "border-emerald-500/30",
      features: [
        "Hasta 5 cuentas TikTok",
        "Seguimiento de competidores",
        "Analítica básica",
        "Top 5 vídeos virales",
        "Sincronización manual",
      ],
      cta: "Plan actual",
      ctaDisabled: true,
      ctaClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default",
    },
    {
      name: "Pro",
      price: "€19",
      period: "/mes",
      badge: "Más popular",
      badgeColor: "bg-violet-500/20 text-violet-400 border-violet-500/30",
      gradient: "from-violet-500/20 to-transparent",
      border: "border-violet-500/40",
      features: [
        "Cuentas ilimitadas",
        "Competidores ilimitados",
        "Analítica avanzada + histórico",
        "Alertas automáticas por e-mail",
        "Exportación PDF/CSV",
        "Sincronización automática diaria",
        "Soporte prioritario",
      ],
      cta: "Próximamente",
      ctaDisabled: true,
      ctaClass: "bg-violet-600/40 text-violet-300 border border-violet-500/30 cursor-not-allowed",
    },
    {
      name: "Agencia",
      price: "€49",
      period: "/mes",
      badge: "Para equipos",
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      gradient: "from-amber-500/20 to-transparent",
      border: "border-amber-500/30",
      features: [
        "Todo lo de Pro",
        "Hasta 10 workspaces",
        "Panel multi-cliente",
        "White-label reports",
        "API access",
        "Gestor de equipo",
        "SLA 99.9%",
      ],
      cta: "Próximamente",
      ctaDisabled: true,
      ctaClass: "bg-amber-600/40 text-amber-300 border border-amber-500/30 cursor-not-allowed",
    },
  ]

  return typeof document !== "undefined" ? ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[80]" onClick={onClose} />
      {/* Modal */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-3xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ background: 'oklch(0.08 0.018 260)', maxHeight: '90vh', overflowY: 'auto' }}
        >
          {/* Header */}
          <div className="relative p-6 sm:p-8 border-b border-white/5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-[80px]" />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gem className="size-5 text-violet-400" />
                  <span className="text-xs font-black uppercase tracking-[0.3em] text-violet-400">Stats Hub Premium</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: 'var(--font-syne)' }}>
                  Elige tu plan
                </h2>
                <p className="text-sm text-muted-foreground/70 mt-1 font-medium">
                  Actualmente en beta pública gratuita. Los planes de pago llegan pronto.
                </p>
              </div>
              <button
                onClick={onClose}
                className="size-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 ml-4"
              >
                <X className="size-4 text-white/60" />
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border ${plan.border} overflow-hidden flex flex-col`}
                style={{ background: 'oklch(0.10 0.018 260)' }}
              >
                {/* Plan gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${plan.gradient} opacity-60`} />

                <div className="relative z-10 p-5 flex flex-col flex-1">
                  {/* Badge */}
                  <span className={`self-start text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border mb-3 ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>

                  {/* Name + price */}
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-white" style={{ fontFamily: 'var(--font-syne)' }}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black text-white">{plan.price}</span>
                      {plan.period && <span className="text-sm text-muted-foreground/60 font-medium">{plan.period}</span>}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground/80">
                        <span className="text-emerald-400 font-black shrink-0 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    disabled={plan.ctaDisabled}
                    className={`w-full py-2.5 rounded-xl text-sm font-black tracking-wide transition-all ${plan.ctaClass}`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="px-6 sm:px-8 pb-6 text-center">
            <p className="text-[10px] text-muted-foreground/40 font-medium">
              💎 Los usuarios beta actuales tendrán descuento especial al lanzar los planes de pago.
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body
  ) : null
}

function TopBar() {
  const { notifications, markNotificationRead } = useWorkspace()
  const unreadCount = notifications.filter(n => !n.read).length
  const [open, setOpen] = React.useState(false)
  const [showPricing, setShowPricing] = React.useState(false)

  const iconMap: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 text-emerald-400" />,
    warning: <AlertCircle className="size-4 text-orange-400" />,
    alert:   <BellRing className="size-4 text-red-500" />,
    info:    <BarChart3 className="size-4 text-blue-400" />,
  }

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 px-3 md:px-6 py-3 md:py-4 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <SidebarTrigger className="glass-sm h-9 w-9 rounded-xl border-white/10 hover:bg-white/5 transition-all shrink-0" />
      <div className="h-6 w-px bg-white/10" />
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 hidden sm:inline-block">
        Stats Hub
      </div>
      <div className="ml-auto flex items-center gap-3">

        {/* ── Notification Bell ── */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="relative size-9 flex items-center justify-center rounded-xl glass border border-white/10 hover:bg-white/5 transition-all outline-none"
          >
            <Bell className="size-4 text-white/80" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2.5 size-1.5 rounded-full bg-orange-500 animate-pulse" />
            )}
          </button>

          {open && typeof document !== "undefined" && (
            <>
              {/* Backdrop */}
              {ReactDOM.createPortal(
                <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />,
                document.body
              )}

              {/* Notification panel — fixed, below topbar, right-aligned */}
              {ReactDOM.createPortal(
                <div
                  className="fixed top-[56px] right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-80 z-[60] animate-in fade-in slide-in-from-top-2"
                  style={{ maxWidth: '320px' }}
                >
                  <div className="glass border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                       style={{ background: 'oklch(0.09 0.018 260 / 0.97)', backdropFilter: 'blur(24px)' }}>
                    <div className="px-4 py-3 flex justify-between items-center border-b border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Notificaciones</span>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-md text-[8px] font-black">{unreadCount} nuevas</span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/40 text-xs">Sin novedades.</div>
                      ) : (
                        <div className="flex flex-col gap-0.5 p-1">
                          {notifications.slice().reverse().map(n => (
                            <div
                              key={n.id}
                              onClick={() => { markNotificationRead(n.id); }}
                              className={`relative p-3 rounded-xl transition-all cursor-pointer border hover:bg-white/5 ${
                                n.read ? 'opacity-50 border-transparent' : 'bg-white/[0.02] border-white/5'
                              }`}
                            >
                              {!n.read && (
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-violet-400" />
                              )}
                              <div className={`flex items-start gap-3 ${!n.read ? 'pl-2' : ''}`}>
                                <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
                                <div>
                                  <p className="text-sm font-bold text-white leading-tight mb-0.5">{n.title}</p>
                                  <p className="text-xs text-muted-foreground/70 leading-snug">{n.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </>
          )}
        </div>

        <div className="h-6 w-px bg-white/10" />

        {/* 💎 Pro badge — opens pricing modal */}
        <button
          title="Membresía Pro · Próximamente"
          onClick={() => setShowPricing(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 transition-all group cursor-pointer"
        >
          <Gem className="size-3.5 text-violet-400 group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-400 hidden sm:inline">Pro · Próximamente</span>
          <span className="size-1.5 rounded-full bg-violet-400 animate-pulse" />
        </button>

        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}

        <div className="h-6 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="status-online" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80 hidden sm:inline">En línea</span>
        </div>
      </div>
    </div>
  )
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === "/login") {
    return <>{children}</>
  }

  return (
    <WorkspaceProvider>
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
              <TopBar />
              <div className="p-3 sm:p-5 md:p-8">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </AuthGuard>
    </WorkspaceProvider>
  )
}
