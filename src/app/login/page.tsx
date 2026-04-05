"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, BarChart3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = React.useState<"login" | "register">("login")
  const [form, setForm] = React.useState({ name: "", email: "", password: "" })
  const [showPass, setShowPass] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tab,
          email: form.email,
          password: form.password,
          name: form.name
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push("/")
      router.refresh()
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: "oklch(0.07 0.018 260)" }}>
      {/* Background orbs */}
      <div className="absolute -top-40 -left-40 size-[600px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 size-[500px] rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 shadow-2xl shadow-violet-500/30 mb-4">
            <BarChart3 className="size-7 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: "var(--font-syne)" }}>
            Stats Hub
          </h1>
          <p className="text-sm text-muted-foreground/60 font-medium mt-1">
            Analítica TikTok en tiempo real
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl border border-white/[0.07] p-8">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-2xl bg-white/5 mb-6">
            {(["login", "register"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null) }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === t ? "bg-violet-600 text-white shadow-lg" : "text-muted-foreground/60 hover:text-white"
                }`}
              >
                {t === "login" ? "Iniciar sesión" : "Registrarse"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {tab === "register" && (
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Nombre</label>
                <Input
                  placeholder="Tu nombre"
                  value={form.name}
                  onChange={update("name")}
                  className="glass border-white/10 rounded-xl h-11 text-white font-medium"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Email</label>
              <Input
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={update("email")}
                className="glass border-white/10 rounded-xl h-11 text-white font-medium"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">Contraseña</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update("password")}
                  className="glass border-white/10 rounded-xl h-11 text-white font-medium pr-11"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 font-medium">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/20 mt-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : tab === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/30 mt-6 font-medium">
          Stats Hub © 2026 · Datos reales de TikTok en tiempo real
        </p>
      </div>
    </div>
  )
}
