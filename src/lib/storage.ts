/**
 * Storage abstraction layer.
 * - Development (local): uses the filesystem (src/lib/data/*.json)
 * - Production (Netlify): uses Netlify Blobs (persistent serverless KV)
 */

// Netlify Functions run on AWS Lambda at /var/task
// Detect any of Netlify's serverless indicators
const IS_NETLIFY =
  process.env.NETLIFY === "true" ||
  process.env.NETLIFY === "1" ||
  !!process.env.NETLIFY_SITE_ID ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  (typeof process.env.LAMBDA_TASK_ROOT === "string" &&
    process.env.LAMBDA_TASK_ROOT.startsWith("/var/task"))


// ── USERS ─────────────────────────────────────────────────────────────────

export async function readUsers(): Promise<any[]> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("users", { type: "text" })
    if (!raw) return []
    return JSON.parse(raw)
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/users.json")
    if (!fs.existsSync(p)) return []
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  }
}

export async function writeUsers(users: any[]): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("users", JSON.stringify(users))
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/users.json")
    fs.writeFileSync(p, JSON.stringify(users, null, 2))
  }
}

// ── ACCOUNTS DB ──────────────────────────────────────────────────────────

interface DB {
  workspaces:    Record<string, any[]>
  accounts:      Record<string, any[]>
  competitors:   Record<string, any[]>
  goals:         Record<string, any[]>   // userId → goals[]
  snapshots:     Record<string, any[]>   // accountId → snapshots[] (last 30)
  alerts:        Record<string, any[]>   // userId → competitor alerts[]
  notifications: Record<string, any[]>   // userId → notification[]
}

const EMPTY_DB: DB = { workspaces: {}, accounts: {}, competitors: {}, goals: {}, snapshots: {}, alerts: {}, notifications: {} }

export async function readDB(): Promise<DB> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("accounts", { type: "text" })
    if (!raw) return { ...EMPTY_DB }
    const data = JSON.parse(raw)
    // Migration guard
    if (Array.isArray(data.workspaces) || Array.isArray(data.accounts)) {
      return { ...EMPTY_DB }
    }
    return data
  } else {
    const fs = await import("fs")
    const path = await import("path")
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
}

export async function writeDB(data: DB): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("accounts", JSON.stringify(data))
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/accounts.json")
    fs.writeFileSync(p, JSON.stringify(data, null, 2))
  }
}

// ── ADMIN SETTINGS (API keys etc.) ────────────────────────────────────────────

export async function readSettings(): Promise<Record<string, string>> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("settings", { type: "text" })
    if (!raw) return {}
    return JSON.parse(raw)
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/settings.json")
    if (!fs.existsSync(p)) return {}
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  }
}

export async function writeSettings(settings: Record<string, string>): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("settings", JSON.stringify(settings))
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/settings.json")
    fs.writeFileSync(p, JSON.stringify(settings, null, 2))
  }
}

// ── AGENCY DB (independent from main workspace accounts) ─────────────────────

interface AgencyDB {
  clients: any[]   // { id, handle, followers, likes, posts, engagement, avatar, verified, lastSync, bio, views, agencyNote }
}

const EMPTY_AGENCY: AgencyDB = { clients: [] }

export async function readAgencyDB(): Promise<AgencyDB> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    const raw = await store.get("agency", { type: "text" })
    if (!raw) return { ...EMPTY_AGENCY }
    return JSON.parse(raw)
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/agency.json")
    if (!fs.existsSync(p)) return { ...EMPTY_AGENCY }
    return JSON.parse(fs.readFileSync(p, "utf-8"))
  }
}

export async function writeAgencyDB(data: AgencyDB): Promise<void> {
  if (IS_NETLIFY) {
    const { getStore } = await import("@netlify/blobs")
    const store = getStore("statshub")
    await store.set("agency", JSON.stringify(data))
  } else {
    const fs = await import("fs")
    const path = await import("path")
    const p = path.join(process.cwd(), "src/lib/data/agency.json")
    fs.writeFileSync(p, JSON.stringify(data, null, 2))
  }
}

