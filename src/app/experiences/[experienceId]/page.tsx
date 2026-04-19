// Whop App entry point — server component
// Whop loads the app at /experiences/[experienceId]
// We verify the user via the x-whop-user-token header (auto-injected by Whop iframe)
// then redirect to the dashboard with company isolation context set.

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getWhopSdk } from "@/lib/whop"
import { BarChart3, Loader2, Lock } from "lucide-react"

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

// Access denied component
function AccessDenied() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0c] p-6">
      <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
        <Lock className="size-7 text-white" />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-black text-white mb-2" style={{ fontFamily: "var(--font-syne)" }>
          Access Required
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          You need an active license to access this app. Please purchase through Whop.
        </p>
      </div>
      <a
        href="https://whop.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition-all"
      >
        Get Access
      </a>
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

  // Check for Whop token
  const whopToken = hdrs.get("x-whop-user-token")
  
  // Development mode: bypass auth
  if (process.env.NODE_ENV === "development") {
    redirect("/")
  }

  // No token = not in Whop iframe
  if (!whopToken) {
    return <AccessDenied />
  }

  try {
    const sdk = getWhopSdk();
    if (!sdk) {
      console.error("[Whop] SDK init failed");
      return <AccessDenied />
    }

    // Verify user via native Whop token
    const { userId } = await sdk.verifyUserToken(hdrs)

    // Fetch experience to get company context
    const experience = await sdk.experiences.retrieve(experienceId)
    const companyId = experience.company.id

    // Check user has access to this experience
    await sdk.users.checkAccess(experienceId, { id: userId })

    // Success! Redirect to main dashboard
    redirect("/")
    
  } catch (err: any) {
    console.error("[Whop] Auth error:", err?.message || err);
    
    // Return access denied UI instead of error
    return <AccessDenied />
  }
}
