import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { readSettings, writeSettings, readUsers, writeUsers } from "@/lib/storage"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  const user  = token ? (await import("@/lib/auth")).verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await readSettings()
  const users    = await readUsers()
  const dbUser   = users.find((u: any) => u.id === user.id)

  return NextResponse.json({
    rapidApiConfigured: !!(settings.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY),
    rapidApiKeyPreview: settings.RAPIDAPI_KEY
      ? `${settings.RAPIDAPI_KEY.slice(0, 6)}${"•".repeat(20)}`
      : process.env.RAPIDAPI_KEY
        ? `(env) ${process.env.RAPIDAPI_KEY.slice(0, 6)}${"•".repeat(20)}`
        : null,
    dataConsent:   dbUser?.dataConsent   ?? false,
    dataConsentAt: dbUser?.dataConsentAt ?? null,
  })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  const user  = token ? (await import("@/lib/auth")).verifyToken(token) : null
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action, key, value } = body

  if (action === "save-rapidapi-key") {
    if (!key || typeof key !== "string" || key.trim().length < 10) {
      return NextResponse.json({ error: "Clave inválida" }, { status: 400 })
    }
    const settings = await readSettings()
    settings.RAPIDAPI_KEY = key.trim()
    await writeSettings(settings)
    return NextResponse.json({ ok: true })
  }

  if (action === "delete-rapidapi-key") {
    const settings = await readSettings()
    delete settings.RAPIDAPI_KEY
    await writeSettings(settings)
    return NextResponse.json({ ok: true })
  }

  // ── GDPR data consent ────────────────────────────────────────────────────
  if (action === "set-data-consent") {
    const consent = value === true || value === "true"
    const users   = await readUsers()
    let found = users.find((u: any) => u.id === user.id)
    if (!found) {
      found = { id: user.id, email: user.email, createdAt: new Date().toISOString() }
      users.push(found)
    }
    found.dataConsent   = consent
    found.dataConsentAt = consent ? new Date().toISOString() : null
    await writeUsers(users)
    return NextResponse.json({ ok: true, dataConsent: consent })
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 })
}

