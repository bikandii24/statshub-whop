"use client"

import * as React from "react"
import Link from "next/link"
import { Cookie, X, Check } from "lucide-react"

export function CookieBanner() {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // Show only if consent not yet given
    if (!localStorage.getItem("cookie_consent")) {
      // Small delay so it doesn't flash immediately
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [])

  function accept() {
    localStorage.setItem("cookie_consent", "accepted")
    setVisible(false)
  }

  function decline() {
    localStorage.setItem("cookie_consent", "declined")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[9999] animate-in slide-in-from-bottom-4 duration-500">
      <div className="glass border border-white/[0.12] rounded-2xl p-5 shadow-2xl shadow-black/50 backdrop-blur-2xl">
        {/* Close */}
        <button onClick={decline} className="absolute top-3 right-3 text-muted-foreground/40 hover:text-white transition-colors">
          <X className="size-3.5" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="size-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Cookie className="size-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white mb-1">Cookies & Privacy</p>
            <p className="text-[11px] text-muted-foreground/60 leading-snug">
              We use essential cookies for authentication and preferences.{" "}
              <Link href="/privacidad" className="text-violet-400 hover:text-violet-300 underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={decline}
            className="flex-1 h-9 rounded-xl border border-white/10 text-xs font-bold text-muted-foreground/60 hover:text-white hover:bg-white/5 transition-all"
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="flex-1 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-black text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Check className="size-3" /> Accept
          </button>
        </div>
      </div>
    </div>
  )
}
