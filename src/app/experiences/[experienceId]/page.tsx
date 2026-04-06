"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2, BarChart3 } from "lucide-react"

// Whop loads the iframe at /experiences/[experienceId]?whop-dev-user-token=...
// We just redirect to the dashboard root after capturing the token
export default function ExperiencePage() {
  const router = useRouter()
  const params = useParams()

  useEffect(() => {
    // Extract whop-dev-user-token from URL if present
    const searchParams = new URLSearchParams(window.location.search)
    const whopToken = searchParams.get("whop-dev-user-token")

    const redirect = () => router.replace("/")

    if (whopToken) {
      // Send token to auto-session endpoint to create a proper session
      fetch(`/api/auth/whop-token?token=${encodeURIComponent(whopToken)}`)
        .then(() => redirect())
        .catch(() => redirect())
    } else {
      redirect()
    }
  }, [router])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "oklch(0.07 0.018 260)" }}
    >
      <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
        <BarChart3 className="size-7 text-white" />
      </div>
      <Loader2 className="size-5 animate-spin text-violet-400" />
      <p className="text-xs text-white/30 font-medium">Loading Stats Hub…</p>
    </div>
  )
}
