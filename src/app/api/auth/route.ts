import { NextRequest, NextResponse } from "next/server"
import { createUser, verifyUser, signToken } from "@/lib/auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const ip = getClientIp(req as any)

  try {
    const body = await req.json()
    const { action, email, password, name } = body

    // ── Validate input ────────────────────────────────────────────────────
    if (!action || typeof action !== "string") {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
    }

    if (action === "logout") {
      const res = NextResponse.json({ ok: true })
      res.cookies.delete("sh_token")
      return res
    }

    // ── Rate limit: 10 auth attempts per 15 minutes per IP ────────────────
    const limit = checkRateLimit(`auth:${ip}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) {
      const retryAfter = Math.ceil(limit.resetIn / 1000)
      const res = NextResponse.json(
        { error: `Demasiados intentos. Espera ${retryAfter}s antes de reintentar.` },
        { status: 429 }
      )
      res.headers.set("Retry-After", retryAfter.toString())
      return res
    }

    // ── Validate common fields ────────────────────────────────────────────
    if (!email || typeof email !== "string" || !email.includes("@") || email.length > 254) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }
    if (!password || typeof password !== "string" || password.length < 6 || password.length > 128) {
      return NextResponse.json({ error: "Contraseña debe tener entre 6 y 128 caracteres" }, { status: 400 })
    }

    if (action === "register") {
      if (!name || typeof name !== "string" || name.trim().length < 2 || name.length > 100) {
        return NextResponse.json({ error: "Nombre debe tener entre 2 y 100 caracteres" }, { status: 400 })
      }
      // Rate limit registrations more strictly: 3 per hour per IP
      const regLimit = checkRateLimit(`register:${ip}`, 3, 60 * 60 * 1000)
      if (!regLimit.allowed) {
        return NextResponse.json({ error: "Límite de registros alcanzado. Intenta en 1 hora." }, { status: 429 })
      }
      const result = await createUser(email.toLowerCase().trim(), name.trim(), password)
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 409 })
      const token = signToken(result.user!)
      const res = NextResponse.json({ user: result.user })
      res.cookies.set("sh_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/"
      })
      return res
    }

    if (action === "login") {
      const result = await verifyUser(email.toLowerCase().trim(), password)
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 401 })
      const token = signToken(result.user!)
      const res = NextResponse.json({ user: result.user })
      res.cookies.set("sh_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/"
      })
      return res
    }

    return NextResponse.json({ error: "Acción desconocida" }, { status: 400 })

  } catch (err: any) {
    console.error("[auth] Error:", err.message)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  if (!token) return NextResponse.json({ user: null })
  const { verifyToken } = await import("@/lib/auth")
  const user = verifyToken(token)
  return NextResponse.json({ user })
}
