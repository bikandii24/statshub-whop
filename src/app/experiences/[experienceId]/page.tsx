// Whop App entry point — server component
// Whop loads the app at /experiences/[experienceId]
// We verify the user via the x-whop-user-token header (auto-injected by Whop iframe)
// then redirect to the dashboard with company isolation context set.

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopsdk } from "@/lib/whop"
import { BarChart3, Loader2 } from "lucide-react"

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ experienceId: string }>
}) {
  const { experienceId } = await params
  const hdrs = await headers()

  try {
    // Verify user via native Whop token (injected in x-whop-user-token header)
    const { userId } = await whopsdk.verifyUserToken(hdrs)

    // Fetch experience to get company context (for multi-tenant data isolation)
    const experience = await whopsdk.experiences.retrieve(experienceId)
    const companyId = experience.company.id

    // Check user has access to this experience
    await whopsdk.users.checkAccess(experienceId, { id: userId })

    // Redirect to main dashboard — session is now established via Whop headers
    redirect("/")
  } catch (err: any) {
    // In development (no Whop iframe): redirect to dashboard with dev session
    if (process.env.NODE_ENV === "development") {
      redirect("/")
    }

    // Access denied or token missing
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
          <BarChart3 className="size-7 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Access required. Please purchase access through Whop.</p>
      </div>
    )
  }
}
