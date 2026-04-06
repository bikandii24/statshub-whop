/**
 * Storage abstraction layer.
 * - Development (local): uses the filesystem (src/lib/data/*.json)
 * - Production (Netlify): uses Netlify Blobs (persistent KV)
 * - Production (Vercel): uses /tmp filesystem (ephemeral, but works in serverless)
 */

import path from "path"
import fs from "fs"

const IS_NETLIFY =
  process.env.NETLIFY === "true" ||
  process.env.NETLIFY === "1" ||
  !!process.env.NETLIFY_SITE_ID ||
  (!!process.env.AWS_LAMBDA_FUNCTION_NAME && !process.env.VERCEL)

const IS_VERCEL = !!process.env.VERCEL

// --- Helpers for /tmp storage (Vercel serverless) ---------------------------

function tmpPath(name: string) {
  return `/tmp/statshub_${name}.json`
}

function readTmp<T>(name: string, fallback: T): T {
  try {
    const p = tmpPath(name)
    if (!fs.existsSync(p)) return fallback
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  } catch {
    return fallback
  }
}

function writeTmp(name: string, data: unknown): void {
  try {
    fs.writeFileSync(tmpPath(name), JSON.stringify(data))
  } catch {
    // /tmp write failed — ignore silently
  }
}

// ── USERS ─────────────────────────────────────────────────────────────────

export async function readUsers(): Promise<any[]> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("users", { type: "text" })
    if (!raw) return []
    return JSON.parse(raw)
  }
  if (IS_VERCEL) return readTmp("users", [])
  // Local dev
  const p = path.join(process.cwd(), "src/lib/data/users.json")
  if (!fs.existsSync(p)) return []
  return JSON.parse(fs.readFileSync(p, "utf-8"))
}

export async function writeUsers(users: any[]): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("users", JSON.stringify(users))
    return
  }
  if (IS_VERCEL) { writeTmp("users", users); return }
  const p = path.join(process.cwd(), "src/lib/data/users.json")
  fs.writeFileSync(p, JSON.stringify(users, null, 2))
}

// ── ACCOUNTS DB ──────────────────────────────────────────────────────────

interface DB {
  workspaces:    Record<string, any[]>
  accounts:      Record<string, any[]>
  competitors:   Record<string, any[]>
  goals:         Record<string, any[]>
  snapshots:     Record<string, any[]>
  alerts:        Record<string, any[]>
  notifications: Record<string, any[]>
}

const EMPTY_DB: DB = {
  workspaces: {}, accounts: {}, competitors: {},
  goals: {}, snapshots: {}, alerts: {}, notifications: {},
}

export async function readDB(): Promise<DB> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("accounts", { type: "text" })
    if (!raw) return { ...EMPTY_DB }
    const data = JSON.parse(raw)
    if (Array.isArray(data.workspaces) || Array.isArray(data.accounts)) return { ...EMPTY_DB }
    return data
  }
  if (IS_VERCEL) {
    const data = readTmp<DB>("accounts", { ...EMPTY_DB })
    if (Array.isArray(data.workspaces) || Array.isArray(data.accounts)) return { ...EMPTY_DB }
    return data
  }
  // Local dev
  const p = path.join(process.cwd(), "src/lib/data/accounts.json")
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, JSON.stringify(EMPTY_DB, null, 2))
    return { ...EMPTY_DB }
  }
  const raw = JSON.parse(fs.readFileSync(p, "utf-8"))
  if (Array.isArray(raw.workspaces) || Array.isArray(raw.accounts)) {
    fs.writeFileSync(p, JSON.stringify(EMPTY_DB, null, 2))
    return { ...EMPTY_DB }
  }
  return raw
}

export async function writeDB(data: DB): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("accounts", JSON.stringify(data))
    return
  }
  if (IS_VERCEL) { writeTmp("accounts", data); return }
  const p = path.join(process.cwd(), "src/lib/data/accounts.json")
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
}

// ── ADMIN SETTINGS ────────────────────────────────────────────────────────────

export async function readSettings(): Promise<Record<string, string>> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("settings", { type: "text" })
    if (!raw) return {}
    return JSON.parse(raw)
  }
  if (IS_VERCEL) return readTmp("settings", {})
  const p = path.join(process.cwd(), "src/lib/data/settings.json")
  if (!fs.existsSync(p)) return {}
  return JSON.parse(fs.readFileSync(p, "utf-8"))
}

export async function writeSettings(settings: Record<string, string>): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("settings", JSON.stringify(settings))
    return
  }
  if (IS_VERCEL) { writeTmp("settings", settings); return }
  const p = path.join(process.cwd(), "src/lib/data/settings.json")
  fs.writeFileSync(p, JSON.stringify(settings, null, 2))
}

// ── AGENCY DB ─────────────────────────────────────────────────────────────────

interface AgencyDB {
  clients: any[]
}

const EMPTY_AGENCY: AgencyDB = { clients: [] }

export async function readAgencyDB(): Promise<AgencyDB> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("agency", { type: "text" })
    if (!raw) return { ...EMPTY_AGENCY }
    return JSON.parse(raw)
  }
  if (IS_VERCEL) return readTmp("agency", { ...EMPTY_AGENCY })
  const p = path.join(process.cwd(), "src/lib/data/agency.json")
  if (!fs.existsSync(p)) return { ...EMPTY_AGENCY }
  return JSON.parse(fs.readFileSync(p, "utf-8"))
}

export async function writeAgencyDB(data: AgencyDB): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("agency", JSON.stringify(data))
    return
  }
  if (IS_VERCEL) { writeTmp("agency", data); return }
  const p = path.join(process.cwd(), "src/lib/data/agency.json")
  fs.writeFileSync(p, JSON.stringify(data, null, 2))
}
