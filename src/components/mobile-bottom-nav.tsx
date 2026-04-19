"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Video, BarChart3, Settings } from "lucide-react"
import { useT } from "@/i18n"

const NAV_ITEMS = [
  { href: "/",              icon: LayoutDashboard, labelKey: "nav_dashboard" as const },
  { href: "/accounts", icon: Video,           labelKey: "nav_tiktok"    as const },
  { href: "/analitica",     icon: BarChart3,       labelKey: "nav_analytics" as const },
  { href: "/configuracion", icon: Settings,        labelKey: "nav_settings"  as const },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const t = useT()

  // Hide on admin/login
  if (pathname === "/login" || pathname.startsWith("/admin")) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 border-t border-white/[0.07]"
        style={{ background: "oklch(0.07 0.018 260 / 0.92)", backdropFilter: "blur(24px)" }}
      />
      <div className="relative flex items-center justify-around px-2 h-16 safe-area-bottom">
        {NAV_ITEMS.map(({ href, icon: Icon, labelKey }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all min-w-[60px] ${
                isActive
                  ? "text-violet-400"
                  : "text-muted-foreground/40 hover:text-muted-foreground/70"
              }`}
            >
              <div className="relative">
                <Icon className="size-5" />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-violet-400" />
                )}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                {t[labelKey]?.split(" ")[0] ?? labelKey}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
