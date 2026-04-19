"use client"

import * as React from "react"
import ReactDOM from "react-dom"
import { usePathname } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { WorkspaceProvider, useWorkspace } from "@/context/workspace-context"
import { BarChart3, Loader2, Bell, BellRing, CheckCircle2, AlertCircle } from "lucide-react"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

// Inner guard — Whop controls access, so we just wait for session init then show dashboard
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthLoading } = useWorkspace()

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <BarChart3 className="size-7 text-white" />
        </div>
        <Loader2 className="size-5 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  return <>{children}</>
}

function TopBar() {
  const { notifications, markNotificationRead } = useWorkspace()
  const unreadCount = notifications.filter(n => !n.read).length
  const [open, setOpen] = React.useState(false)

  const iconMap: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 text-emerald-400" />,
    warning: <AlertCircle className="size-4 text-orange-400" />,
    alert:   <BellRing className="size-4 text-red-500" />,
    info:    <BarChart3 className="size-4 text-blue-400" />,
  }

  return (
    <div className="sticky top-0 z-40 flex items-center gap-2 px-3 md:px-6 py-3 md:py-4 border-b border-border bg-background/80 backdrop-blur-xl">
      <SidebarTrigger className="glass-sm h-9 w-9 rounded-xl hover:bg-muted/50 transition-all shrink-0" />
      <div className="h-6 w-px bg-border" />
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 hidden sm:inline-block">
        Stats Hub
      </div>
      <div className="ml-auto flex items-center gap-3">

        {/* ── Notification Bell ── */}
        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="relative size-9 flex items-center justify-center rounded-xl glass border border-border hover:bg-muted/50 transition-all outline-none"
          >
            <Bell className="size-4 text-foreground/80" />
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

              {/* Notification panel */}
              {ReactDOM.createPortal(
                <div
                  className="fixed top-[56px] right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-80 z-[60] animate-in fade-in slide-in-from-top-2"
                  style={{ maxWidth: '320px' }}
                >
                  <div className="glass border border-border rounded-2xl shadow-2xl overflow-hidden bg-popover">
                    <div className="px-4 py-3 flex justify-between items-center border-b border-border">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-md text-[8px] font-black">{unreadCount} new</span>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/40 text-xs">No notifications.</div>
                      ) : (
                        <div className="flex flex-col gap-0.5 p-1">
                          {notifications.slice().reverse().map(n => (
                            <div
                              key={n.id}
                              onClick={() => { markNotificationRead(n.id); }}
                              className={`relative p-3 rounded-xl transition-all cursor-pointer border hover:bg-muted/30 ${
                                n.read ? 'opacity-50 border-transparent' : 'bg-muted/20 border-border'
                              }`}
                            >
                              {!n.read && (
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-violet-400" />
                              )}
                              <div className={`flex items-start gap-3 ${!n.read ? 'pl-2' : ''}`}>
                                <div className="mt-0.5 shrink-0">{iconMap[n.type]}</div>
                                <div>
                                  <p className="text-sm font-bold text-foreground leading-tight mb-0.5">{n.title}</p>
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

        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="status-online" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80 hidden sm:inline">Online</span>
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
              <div className="p-3 sm:p-5 md:p-8 pb-24 sm:pb-8">
                {children}
              </div>
            </main>
          </div>
          <MobileBottomNav />
        </SidebarProvider>
      </AuthGuard>
    </WorkspaceProvider>
  )
}
