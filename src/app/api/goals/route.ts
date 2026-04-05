import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { readDB, writeDB } from '@/lib/storage'

function getUser(req: NextRequest) {
  const token = req.cookies.get('sh_token')?.value
  return token ? verifyToken(token) : null
}

// ── GET: list goals & alerts for user ────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await readDB() as any
  return NextResponse.json({
    goals:  db.goals?.[user.id]  ?? [],
    alerts: db.alerts?.[user.id] ?? [],
  })
}

// ── POST: create / delete goals and alerts ────────────────────────────────
export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, payload } = await req.json()
  const db = await readDB() as any
  if (!db.goals)  db.goals  = {}
  if (!db.alerts) db.alerts = {}
  if (!db.goals[user.id])  db.goals[user.id]  = []
  if (!db.alerts[user.id]) db.alerts[user.id] = []

  // ── GOALS ──────────────────────────────────────────────────────────────
  if (action === 'add-goal') {
    const { accountId, handle, workspaceId, type, target, deadline } = payload
    if (!type || !target) return NextResponse.json({ error: 'type y target requeridos' }, { status: 400 })
    const goal = {
      id: `goal-${Date.now()}`,
      accountId, handle, workspaceId,
      type,    // 'followers' | 'engagement' | 'likes' | 'posts'
      target: Number(target),
      deadline: deadline ?? null,
      createdAt: new Date().toISOString(),
    }
    db.goals[user.id].push(goal)
    await writeDB(db)
    return NextResponse.json({ goal, goals: db.goals[user.id] })
  }

  if (action === 'delete-goal') {
    db.goals[user.id] = db.goals[user.id].filter((g: any) => g.id !== payload.id)
    await writeDB(db)
    return NextResponse.json({ goals: db.goals[user.id] })
  }

  // ── ALERTS ─────────────────────────────────────────────────────────────
  if (action === 'add-alert') {
    const { handle, type, threshold } = payload
    if (!handle || !threshold) return NextResponse.json({ error: 'handle y threshold requeridos' }, { status: 400 })
    const existing = db.alerts[user.id].find((a: any) => a.handle === handle && a.type === type)
    if (existing) {
      existing.threshold = Number(threshold)
      existing.triggered = false
    } else {
      db.alerts[user.id].push({
        id: `alert-${Date.now()}`,
        handle,
        type: type ?? 'followers',
        threshold: Number(threshold),
        triggered: false,
        createdAt: new Date().toISOString(),
      })
    }
    await writeDB(db)
    return NextResponse.json({ alerts: db.alerts[user.id] })
  }

  if (action === 'delete-alert') {
    db.alerts[user.id] = db.alerts[user.id].filter((a: any) => a.id !== payload.id)
    await writeDB(db)
    return NextResponse.json({ alerts: db.alerts[user.id] })
  }

  if (action === 'dismiss-alert') {
    const alert = db.alerts[user.id].find((a: any) => a.id === payload.id)
    if (alert) alert.triggered = false
    await writeDB(db)
    return NextResponse.json({ alerts: db.alerts[user.id] })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
