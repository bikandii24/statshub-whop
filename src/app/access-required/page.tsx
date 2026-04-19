// Access Required page - shown when user doesn't have Whop license

import { BarChart3, ExternalLink } from "lucide-react"
import Link from "next/link"

export default function AccessRequiredPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0a0a0c] p-6">
      {/* Logo */}
      <div className="size-16 rounded-2xl bg-gradient-to-br from-violet-600 via-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
        <BarChart3 className="size-8 text-white" />
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black tracking-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
          Access Required
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          This content is only available to active members. Purchase access through Whop to continue.
        </p>
      </div>

      {/* CTA Button */}
      <Link
        href="https://whop.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all hover:scale-105 shadow-xl shadow-violet-500/25"
      >
        <span>Get Access on Whop</span>
        <ExternalLink className="size-4" />
      </Link>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground/40 font-medium">
        Stats Hub • Powered by Whop
      </p>
    </div>
  )
}
