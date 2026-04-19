"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface Workspace {
  id: string
  name: string
  icon: string
  color: string
}

export interface RecentPost {
  id: string
  description: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  shares: number
  createTime: number          // Unix seconds
  // Extended fields (optional for backward compat)
  url?: string                // Direct link to content
  type?: "short" | "video" | "reel" | "post" | "tweet" | "photo"
  duration?: number           // seconds (YouTube)
}

export type SocialPlatform = "tiktok" | "instagram" | "youtube" | "facebook" | "twitter"

export interface Account {
  id: string
  handle: string
  workspaceId: string
  platform: SocialPlatform
  followers: number
  following: number
  likes: number
  posts: number
  views: number          // real play_count sum / manual
  viewsIsReal?: boolean
  engagement: number
  avatar: string
  bio: string
  verified: boolean
  lastSync: string
  recentPosts?: RecentPost[]
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: "success" | "warning" | "info" | "alert"
  read: boolean
  timestamp: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
}

interface WorkspaceContextType {
  // Auth
  user: AuthUser | null
  isAuthLoading: boolean
  // Data
  workspaces: Workspace[]
  accounts: Account[]
  snapshots: Record<string, any[]>
  notifications: NotificationItem[]
  activeWorkspace: Workspace | null
  setActiveWorkspace: (workspace: Workspace) => void
  addAccount: (handle: string, platform?: SocialPlatform, manualData?: { followers?: number; views?: number; posts?: number; engagement?: number }) => Promise<{ success: boolean; error?: string }>
  syncAccount: (id: string) => Promise<{ success: boolean; error?: string }>
  addWorkspace: (name: string, icon?: string, color?: string) => Promise<void>
  renameWorkspace: (id: string, name: string) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  deleteAccount: (id: string) => Promise<void>
  markNotificationRead: (id: string) => void
  isLoading: boolean
  apiConfigured: boolean
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [snapshots, setSnapshots] = useState<Record<string, any[]>>({})
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "mock-1", title: "Welcome to Stats Hub!", message: "Connect your first account to start tracking.", type: "info", read: false, timestamp: new Date().toISOString() }
  ])
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [apiConfigured, setApiConfigured] = useState(false)

  // Check auth on mount — uses native Whop token (no login/logout needed)
  useEffect(() => {
    fetch("/api/auth")
      .then(r => r.json())
      .then(d => {
        if (d.user) setUser(d.user)
        setIsAuthLoading(false)
      })
      .catch(() => {
        setIsAuthLoading(false)
      })
  }, [])

  // Fetch workspace data once we have a user
  useEffect(() => {
    if (!user) { setIsLoading(false); return }
    fetchData()
  }, [user])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/accounts")
      const data = await res.json()
      setWorkspaces(data.workspaces ?? [])
      setAccounts(data.accounts ?? [])
      setSnapshots(data.snapshots ?? {})
      setApiConfigured(data.apiConfigured ?? false)
      if (data.workspaces?.length > 0) {
        setActiveWorkspace(prev => prev ?? data.workspaces[0])
      }
      // Merge cron-generated notifications from DB (dedup by id)
      if (data.notifications?.length > 0) {
        setNotifications(prev => {
          const existingIds = new Set(prev.map((n: NotificationItem) => n.id))
          const fresh = data.notifications.filter((n: NotificationItem) => !existingIds.has(n.id))
          return fresh.length > 0 ? [...fresh.reverse(), ...prev] : prev
        })
      }
    } catch (err) {
      console.error("Failed to fetch workspace data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // No logout needed — Whop handles authentication natively

  const addAccount = async (handle: string, platform: SocialPlatform = "tiktok", manualData?: { followers?: number; views?: number; posts?: number; engagement?: number }) => {
    if (!activeWorkspace) return { success: false, error: "No active workspace" }
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-account", payload: { handle, workspaceId: activeWorkspace.id, platform, manualData } })
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error ?? "Error adding account" }
    setAccounts(data.accounts ?? [])
    return { success: true }
  }

  const syncAccount = async (id: string) => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync-account", payload: { id } })
    })
    const data = await res.json()
    if (!res.ok) return { success: false, error: data.error }
    setAccounts(data.accounts ?? [])
    setSnapshots(prev => ({ ...prev, [id]: data.snapshots }))
    return { success: true }
  }

  const addWorkspace = async (name: string, icon = "Zap", color = "text-violet-400") => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-workspace", payload: { name, icon, color } })
    })
    const data = await res.json()
    setWorkspaces(data.workspaces ?? [])
  }

  const renameWorkspace = async (id: string, name: string) => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rename-workspace", payload: { id, name } })
    })
    const data = await res.json()
    const updated: Workspace[] = data.workspaces ?? []
    setWorkspaces(updated)
    setActiveWorkspace(prev => prev ? (updated.find(w => w.id === prev.id) ?? prev) : null)
  }
  const deleteWorkspace = async (id: string) => {
    if (workspaces.length <= 1) return // never delete the last one
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-workspace", payload: { id } })
    })
    const data = await res.json()
    const updated: Workspace[] = data.workspaces ?? []
    const updatedAccounts = data.accounts ?? []
    setWorkspaces(updated)
    setAccounts(updatedAccounts)
    setActiveWorkspace(prev => {
      if (prev?.id === id) return updated[0] ?? null
      return prev
    })
  }

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const deleteAccount = async (id: string) => {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-account", payload: { id } })
    })
    const data = await res.json()
    setAccounts(data.accounts ?? [])
  }

  return (
    <WorkspaceContext.Provider value={{
      user, isAuthLoading,
      workspaces, accounts, snapshots, notifications, activeWorkspace, setActiveWorkspace,
      addAccount, syncAccount, addWorkspace, renameWorkspace, deleteWorkspace, deleteAccount, markNotificationRead,
      isLoading, apiConfigured
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider")
  return context
}
