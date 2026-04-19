// Whop App entry point — server component
// Whop loads the app at /experiences/[experienceId]
// Public mode: allows access without authentication

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getWhopSdk } from "@/lib/whop"
import { BarChart3, Loader2 } from "lucide-react"

// Loading state component
function LoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0c]">
      <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30 animate-pulse">
        <BarChart3 className="size-7 text-white" />
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm font-medium">Loading Stats Hub...</span>
      </div>
    </div>
  )
}

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>
}) {
  const { experienceId } = await params
  const hdrs = await headers()

  // Public mode: always redirect to dashboard
  redirect("/")
}
