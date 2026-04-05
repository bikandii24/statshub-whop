"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

// No login needed in the Whop version — auto-session is created by AuthGuard.
// If someone lands on /login, redirect them home.
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/") }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.07 0.018 260)" }}>
      <Loader2 className="size-6 animate-spin text-violet-400" />
    </div>
  )
}
