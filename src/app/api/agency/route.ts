import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { readAgencyDB, writeAgencyDB, readSettings } from "@/lib/storage"

// Reuse TikTok scraper logic
async function fetchTikTokAccount(handle: string): Promise<any | null> {
  const cleanHandle = handle.replace(/^@/, "").trim().toLowerCase()
  // Try env first, then stored settings
  let apiKey = process.env.RAPIDAPI_KEY
  if (!apiKey) {
    const settings = await readSettings()
    apiKey = settings.RAPIDAPI_KEY
  }
  if (!apiKey) return null

  const apiHost = process.env.RAPIDAPI_HOST || "tiktok-scraper7.p.rapidapi.com"
  const url = `https://${apiHost}/user/info?unique_id=${cleanHandle}`
  const res = await fetch(url, {
    headers: { "x-rapidapi-key": apiKey, "x-rapidapi-host": apiHost },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) return null
  const data = await res.json()
  const info = data?.data?.user ?? data?.userInfo?.user ?? null
  const stats = data?.data?.stats ?? data?.userInfo?.stats ?? null
  if (!info || !stats) return null

  return {
    id: `agency-${cleanHandle}-${Date.now()}`,
    handle: `@${cleanHandle}`,
    followers: stats.followerCount ?? 0,
    likes: stats.heartCount ?? stats.diggCount ?? 0,
    posts: stats.videoCount ?? 0,
    engagement: stats.followerCount > 0
      ? +((((stats.heartCount ?? 0) / Math.max(stats.videoCount ?? 1, 1)) / stats.followerCount) * 100).toFixed(2)
      : 0,
    avatar: info.avatarThumb ?? info.avatarMedium ?? "",
    bio: info.signature ?? "",
    verified: info.verified ?? false,
    views: Math.round(((stats.heartCount ?? 0) / Math.max(stats.videoCount ?? 1, 1)) / 0.03),
    lastSync: new Date().toISOString(),
    agencyNote: "",
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const db = await readAgencyDB()
  return NextResponse.json({ clients: db.clients })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("sh_token")?.value
  if (!token || !verifyToken(token)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { action, payload } = await req.json()
  const db = await readAgencyDB()

  if (action === "add-client") {
    const { handle } = payload
    if (!handle) return NextResponse.json({ error: "Handle requerido" }, { status: 400 })
    const already = db.clients.find(c => c.handle.toLowerCase() === `@${handle.replace(/^@/, "").toLowerCase()}`)
    if (already) return NextResponse.json({ error: "Esta cuenta ya está en la agencia" }, { status: 409 })

    const account = await fetchTikTokAccount(handle)
    if (!account) return NextResponse.json({ error: "No se pudo obtener la cuenta. Verifica el handle o la API Key." }, { status: 404 })
    db.clients.push(account)
    await writeAgencyDB(db)
    return NextResponse.json({ client: account, clients: db.clients })
  }

  // Bulk import: array of handles
  if (action === "bulk-add-clients") {
    const { handles } = payload as { handles: string[] }
    if (!handles || !handles.length) return NextResponse.json({ error: "Lista vacía" }, { status: 400 })

    const results: { handle: string; ok: boolean; error?: string }[] = []
    for (const h of handles.slice(0, 20)) { // max 20 at once
      const clean = h.replace(/^@/, "").trim().toLowerCase()
      if (!clean) continue
      const already = db.clients.find(c => c.handle.toLowerCase() === `@${clean}`)
      if (already) { results.push({ handle: `@${clean}`, ok: false, error: "Ya existe" }); continue }
      const acc = await fetchTikTokAccount(h)
      if (!acc) { results.push({ handle: `@${clean}`, ok: false, error: "No encontrado" }); continue }
      db.clients.push(acc)
      results.push({ handle: `@${clean}`, ok: true })
    }
    await writeAgencyDB(db)
    return NextResponse.json({ results, clients: db.clients })
  }

  if (action === "delete-client") {
    const { id } = payload
    db.clients = db.clients.filter(c => c.id !== id)
    await writeAgencyDB(db)
    return NextResponse.json({ clients: db.clients })
  }

  if (action === "update-note") {
    const { id, note } = payload
    const client = db.clients.find(c => c.id === id)
    if (client) client.agencyNote = note
    await writeAgencyDB(db)
    return NextResponse.json({ clients: db.clients })
  }

  if (action === "sync-client") {
    const { id } = payload
    const client = db.clients.find(c => c.id === id)
    if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    const updated = await fetchTikTokAccount(client.handle)
    if (!updated) return NextResponse.json({ error: "No se pudo sincronizar" }, { status: 500 })
    Object.assign(client, { ...updated, id: client.id, agencyNote: client.agencyNote })
    await writeAgencyDB(db)
    return NextResponse.json({ clients: db.clients })
  }

  return NextResponse.json({ error: "Acción desconocida" }, { status: 400 })
}
