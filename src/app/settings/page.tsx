"use client"

import { useT } from "@/i18n"
import * as React from "react"
import { Settings, User, Bell, Info, Shield, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWorkspace } from "@/context/workspace-context"

export default function ConfiguracionPage() {
  const t = useT()
  const { user, accounts, workspaces } = useWorkspace()
  const totalAccounts = accounts.length
  const totalWorkspaces = workspaces.length

  const [dataConsent, setDataConsent] = React.useState<boolean | null>(null)
  const [savingConsent, setSavingConsent] = React.useState(false)

  // Load current consent state
  React.useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => setDataConsent(d.dataConsent ?? false))
      .catch(() => setDataConsent(false))
  }, [])

  async function toggleConsent() {
    setSavingConsent(true)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-data-consent", value: !dataConsent }),
      })
      const d = await res.json()
      if (d.ok) setDataConsent(d.dataConsent)
    } finally {
      setSavingConsent(false)
    }
  }

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

      {/* ── GDPR Data Consent ── */}
      <Card className="glass border-violet-500/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Shield className="size-4" />
            </div>
            <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>Privacy & Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Consent toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold text-white mb-0.5">Analytics data sharing</p>
              <p className="text-xs text-muted-foreground/60 leading-snug">
                Allow your accounts&apos; aggregated stats to be used for anonymous market analysis.
                You can withdraw consent at any time.
              </p>
            </div>
            <button
              onClick={toggleConsent}
              disabled={savingConsent || dataConsent === null}
              className={`relative shrink-0 w-12 h-6 rounded-full border transition-all duration-300 outline-none ${
                dataConsent
                  ? "bg-violet-500 border-violet-400"
                  : "bg-white/10 border-white/20"
              } disabled:opacity-50`}
            >
              <div className={`absolute top-0.5 size-5 rounded-full shadow transition-all duration-300 flex items-center justify-center ${
                dataConsent ? "left-6 bg-white" : "left-0.5 bg-white/40"
              }`}>
                {dataConsent && <Check className="size-2.5 text-violet-600" />}
              </div>
            </button>
          </div>

          {/* Link */}
          <a
            href="/privacy"
            className="flex items-center gap-2 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Shield className="size-3" /> View Privacy Policy ↗
          </a>
        </CardContent>
      </Card>

    </div>
  )
}
