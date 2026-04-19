// Login page removed — Whop handles authentication natively.
// This file exists only to redirect any stale bookmarks to the home page.
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/") }, [router])
  return null
}
