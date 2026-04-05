import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { readSettings, writeSettings } from "@/lib/storage"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const settings = await readSettings()
  // Never expose actual key value — only whether it exists
  return NextResponse.json({
    rapidApiConfigured: !!(settings.RAPIDAPI_KEY || process.env.RAPIDAPI_KEY),
    rapidApiKeyPreview: settings.RAPIDAPI_KEY
      ? `${settings.RAPIDAPI_KEY.slice(0, 6)}${"•".repeat(20)}`
      : process.env.RAPIDAPI_KEY
        ? `(env) ${process.env.RAPIDAPI_KEY.slice(0, 6)}${"•".repeat(20)}`
        : null,
  })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { action, key } = body

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

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 })
}
