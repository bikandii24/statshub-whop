"use client"


import { useT } from "@/i18n"
import * as React from "react"
import { Settings, User, Bell, LogOut, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/context/workspace-context"

export default function ConfiguracionPage() {
  const t = useT()
  const { user, accounts, workspaces, logout } = useWorkspace()
  const totalAccounts = accounts.length
  const totalWorkspaces = workspaces.length

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <div className="section-pill bg-violet-500/10 text-violet-400 border-violet-500/20 mb-3">
          <Settings className="size-3" /> Settings
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tighter leading-tight text-white" style={{ fontFamily: "var(--font-syne)" }}>
          System <span className="gradient-text">Settings</span>
        </h1>
        <p className="text-muted-foreground font-medium mt-1 text-sm">Manage your account and preferences.</p>
      </div>

      {/* Account */}
      <Card className="glass border-white/[0.07]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <User className="size-4" />
            </div>
            <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>My Account</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { label: t.settings_name,                        value: user?.name  || "—" },
            { label: "Email",                       value: user?.email || "—" },
            { label: t.settings_plan,                        value: "Free" },
            { label: t.settings_connected_accounts,   value: `${totalAccounts} / 10` },
            { label: t.settings_active_workspaces,           value: totalWorkspaces.toString() },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
              <span className="text-sm text-muted-foreground/70 font-medium">{item.label}</span>
              <span className="text-sm font-bold text-white/90">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Limits */}
      <Card className="glass border-blue-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Info className="size-4" />
            </div>
            <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>Free Plan Limits</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { label: "TikTok accounts",       value: "10 per workspace" },
            { label: "Syncs",                 value: "5 per hour" },
            { label: "Workspaces",            value: "Unlimited" },
            { label: "Competitor analysis",   value: "Available" },
            { label: "Data export",           value: "CSV available" },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0">
              <span className="text-sm text-muted-foreground/70 font-medium">{item.label}</span>
              <span className="text-sm font-bold text-white/80">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="glass border-white/[0.07]">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Bell className="size-4" />
            </div>
            <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>Notifications</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground/50 font-medium italic">Competitor alert notifications are available in the <strong className="text-white/60">Competition</strong> section.</p>
        </CardContent>
      </Card>

      {/* Sign out */}
      <div className="pt-2">
        <Button
          onClick={logout}
          variant="outline"
          className="w-full rounded-xl h-11 font-bold border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
        >
          <LogOut className="size-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  )
}
