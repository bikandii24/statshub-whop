"use client"


import { useT } from "@/i18n"
import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Video,
  BarChart3,
  TrendingUp,
  Newspaper,
  ArrowUpRight,
  Zap,
  Flame,
  Users,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspace } from "@/context/workspace-context";

export default function Home() {
  const t = useT()
  const { activeWorkspace, accounts, isLoading, user } = useWorkspace();
  
  // Filter accounts for active workspace
  const workspaceAccounts = accounts.filter(a => a.workspaceId === activeWorkspace?.id);
  
  // Aggregate stats
  const totalFollowers = workspaceAccounts.reduce((sum, a) => sum + (a.followers || 0), 0);
  const avgEngagement = workspaceAccounts.length > 0 
    ? (workspaceAccounts.reduce((sum, a) => sum + Number(a.engagement || 0), 0) / workspaceAccounts.length).toFixed(1) 
    : "0";
  const totalPosts = workspaceAccounts.reduce((sum, a) => sum + (a.posts || 0), 0);
  const totalLikes = workspaceAccounts.reduce((sum, a) => sum + (a.likes || 0), 0);

  const kpis = [
    { label: "Total Likes", value: totalLikes >= 1000 ? `${(totalLikes/1000).toFixed(1)}K` : totalLikes.toString(), delta: "Synced", icon: Flame, up: null },
    { label: "Engagement", value: `${avgEngagement}%`, delta: "+2.1pp", icon: Activity, up: true },
    { label: "Audience", value: totalFollowers >= 1000 ? `${(totalFollowers/1000).toFixed(1)}K` : totalFollowers.toString(), delta: `+${Math.floor(totalFollowers*0.02)}`, icon: Users, up: true },
    { label: "Total Posts", value: totalPosts.toString(), delta: "Synced", icon: Flame, up: null },
  ];

  const sections = [
    {
      title: "TikTok Manager",
      href: "/accounts",
      description: "Grow your content with automation tools.",
      icon: Video,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
      border: "border-pink-500/20",
      glow: "glow-pink",
      stat: workspaceAccounts.length.toString(),
      statLabel: "linked accounts",
      chip: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    },
    {
      title: "Analytics",
      href: "/analitica",
      description: "Real-time metrics across all your platforms.",
      icon: BarChart3,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      glow: "glow-blue",
      stat: `+${avgEngagement}%`,
      statLabel: "avg engagement",
      chip: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    },
    {
      title: "Competition",
      href: "/seguimiento-competencia",
      description: "Stay ahead of your rivals' trends.",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      glow: "glow-green",
      stat: "5 rivals",
      statLabel: "being tracked",
      chip: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    {
      title: "News",
      href: "/consolidado-noticias",
      description: "Everything you need to know, in one place.",
      icon: Newspaper,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      glow: "glow-amber",
      stat: "3 new",
      statLabel: "last 24h",
      chip: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? t.greeting_morning : hour < 19 ? t.greeting_afternoon : t.greeting_evening;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] mesh-bg noise-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 size-[400px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 md:p-12">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-3">
              <div className="section-pill bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <div className="status-online scale-75" />
                {activeWorkspace?.name || "Stats Hub"} {t.dashboard_active}
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tighter leading-[0.95] text-white" style={{ fontFamily: "var(--font-syne)" }}>
                {greeting},<br />
                <span className="gradient-text">{user?.name || "User"}.</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base font-medium max-w-md leading-relaxed">
                {t.dashboard_consolidated} <span className="text-white font-bold">{activeWorkspace?.name}</span>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Link href="/gestor-tiktok" className="w-full sm:w-auto">
                <Button className="font-bold h-11 px-7 rounded-full shadow-xl shadow-violet-500/25 hover:scale-105 active:scale-95 transition-all bg-violet-600 hover:bg-violet-500 text-white w-full">
                  <Zap className="size-4 mr-2" fill="white" /> {t.dashboard_manage}
                </Button>
              </Link>
              <Link href="/analitica" className="w-full sm:w-auto">
                <Button variant="outline" className="glass-sm h-11 px-7 rounded-full font-bold border-white/10 hover:bg-white/5 text-white/80 w-full">
                  {t.dashboard_view_analytics}
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="glass-sm p-4 rounded-2xl border-white/[0.06] group hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="stat-chip">{kpi.label}</span>
                  <kpi.icon className="size-3.5 text-muted-foreground/30" />
                </div>
                <div className="text-2xl font-black text-white tracking-tighter">
                  {isLoading ? "..." : kpi.value}
                </div>
                {kpi.up !== null ? (
                  <div className={`text-[10px] font-bold mt-0.5 ${kpi.up ? "text-emerald-500" : "text-red-500"}`}>
                    {kpi.up ? "↑" : "↓"} {kpi.delta}
                  </div>
                ) : (
                  <div className="text-[10px] font-bold mt-0.5 text-muted-foreground/50">{kpi.delta}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION CARDS ── */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-5">{t.dashboard_tools}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {sections.map((section) => (
            <Link key={section.title} href="/accounts" className="group">
              <Card className={`glass h-full border-white/[0.07] transition-all duration-500 group-hover:-translate-y-2 group-hover:bg-white/[0.04] ${section.glow}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div className={`p-2.5 rounded-xl ${section.bg} ${section.color} border ${section.border} shadow-inner shrink-0`}>
                    <section.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </CardHeader>
                <CardContent className="pt-1">
                  <CardTitle className="text-lg font-bold mb-1.5 tracking-tight group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-syne)" }}>
                    {section.title}
                  </CardTitle>
                  <CardDescription className="text-sm font-medium leading-relaxed mb-4">
                    {section.description}
                  </CardDescription>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${section.chip}`}>
                    <div className={`size-1 rounded-full ${section.color.replace("text-", "bg-")}`} />
                    {section.stat} · {section.statLabel}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── BOTTOM WIDGETS ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass border-white/[0.07] overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold" style={{ fontFamily: "var(--font-syne)" }}>{t.dashboard_accounts_in_space}</CardTitle>
              <Badge variant="outline" className="glass-sm border-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-widest px-2">
                {activeWorkspace?.name}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/[0.04]">
              {workspaceAccounts.map((acc, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className={`size-8 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0`}>
                    <Video className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white/90 truncate">{acc.handle}</div>
                    <div className="text-[11px] text-muted-foreground/60 font-medium truncate">{acc.followers.toLocaleString()} {t.dashboard_followers}</div>
                  </div>
                  <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest shrink-0">{acc.engagement}% eng.</div>
                </div>
              ))}
              {workspaceAccounts.length === 0 && (
                <div className="p-10 text-center text-muted-foreground/40 italic text-sm">
                  {t.dashboard_no_accounts}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
