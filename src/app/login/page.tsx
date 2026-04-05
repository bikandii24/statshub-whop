"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { BarChart3, Gem, TrendingUp, Users, Play, Loader2, AlertCircle, ExternalLink } from "lucide-react"

const FEATURES = [
  { icon: TrendingUp, text: "Real-time TikTok analytics" },
  { icon: Users,     text: "Competitor tracking & insights" },
  { icon: Play,      text: "Top 5 viral videos per account" },
  { icon: Gem,       text: "Powered by Whop membership" },
]

const ERROR_MESSAGES: Record<string, string> = {
  no_membership:         "You don't have an active Stats Hub membership on Whop.",
  token_exchange_failed: "Authentication failed. Please try again.",
  state_mismatch:        "Security check failed. Please try again.",
  session_expired:       "Session expired. Please try again.",
  access_denied:         "Access denied. You cancelled the login.",
  missing_params:        "Invalid callback. Please try again.",
  userinfo_failed:       "Could not retrieve your Whop profile. Please try again.",
}

// Inner component that uses useSearchParams — wrapped in Suspense below
function LoginInner() {
  const params = useSearchParams()
  const errorKey = params.get("error")
  const buyUrl   = params.get("buy")
  const errorMsg = errorKey ? (ERROR_MESSAGES[errorKey] ?? "Something went wrong. Please try again.") : null
  const [loading, setLoading] = React.useState(false)

  const handleSignIn = () => {
    setLoading(true)
    window.location.href = "/api/auth/whop"
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "oklch(0.07 0.018 260)" }}
    >
      {/* Background orbs */}
      <div className="absolute -top-40 -left-40 size-[600px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[800px] rounded-full bg-pink-500/[0.03] blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-2xl shadow-violet-500/30 mb-4">
            <BarChart3 className="size-8 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Stats Hub
          </h1>
          <p className="text-sm text-muted-foreground/60 font-medium mt-1">
            Real-time TikTok analytics powered by Whop
          </p>
        </div>

        {/* Login card */}
        <div className="glass rounded-3xl border border-white/[0.07] p-8 space-y-6">
          {/* Feature list */}
          <ul className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground/70 font-medium">
                <span className="size-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <Icon className="size-3.5 text-violet-400" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="h-px bg-white/5" />

          {/* Error message */}
          {errorMsg && (
            <div className="flex flex-col gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-3 font-medium">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {buyUrl && (
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition-colors font-bold mt-1"
                >
                  <ExternalLink className="size-3" />
                  Get access on Whop →
                </a>
              )}
            </div>
          )}

          {/* Whop sign-in button */}
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="w-full h-12 rounded-xl font-bold text-sm text-white shadow-xl shadow-violet-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.23 280), oklch(0.50 0.25 310))",
              boxShadow: "0 8px 32px oklch(0.55 0.23 280 / 0.35)",
            }}
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                {/* Whop logo icon */}
                <svg width="20" height="20" viewBox="0 0 40 40" fill="none" aria-hidden>
                  <rect width="40" height="40" rx="12" fill="white" fillOpacity="0.15" />
                  <path d="M10 28L20 12L30 28H23L20 23L17 28H10Z" fill="white" />
                </svg>
                Sign in with Whop
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-muted-foreground/30 font-medium leading-relaxed">
            By signing in you agree to Whop's Terms of Service.
            <br />You must have an active Stats Hub membership on Whop.
          </p>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/20 mt-6 font-medium">
          Stats Hub © 2026 · Real TikTok data, real results.
        </p>
      </div>
    </div>
  )
}

// Suspense boundary required by Next.js for useSearchParams()
export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.018 260)" }}>
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    }>
      <LoginInner />
    </React.Suspense>
  )
}
