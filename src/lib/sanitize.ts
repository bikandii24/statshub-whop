/**
 * Input sanitization & validation utilities.
 * Used server-side in API routes to prevent XSS, injection, and abuse.
 */

// ── Social handle sanitization ─────────────────────────────────────────────
/** Strip @ and only allow valid handle chars. Max 100 chars. */
export function sanitizeHandle(input: unknown): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/^@+/, "")                // remove leading @
    .replace(/[^\w.\-\/: ]/g, "")     // allow word chars, dots, hyphens, slashes, colons, spaces (for URLs)
    .trim()
    .slice(0, 200)                     // max 200 chars
}

/** Validate that a string looks like a plausible social handle or URL */
export function isValidHandle(handle: string): boolean {
  if (!handle || handle.length < 1 || handle.length > 200) return false
  // Allow full URLs (Facebook pages use them)
  if (handle.startsWith("http")) {
    try { new URL(handle); return true } catch { return false }
  }
  // Regular handle: alphanumeric + . _ - (no spaces)
  return /^[\w.\-]{1,100}$/.test(handle)
}

// ── General string sanitization ────────────────────────────────────────────
/** Strip HTML tags and limit length. Safe for storing in DB. */
export function sanitizeString(input: unknown, maxLen = 500): string {
  if (typeof input !== "string") return ""
  return input
    .replace(/<[^>]*>/g, "")          // strip HTML
    .replace(/[<>'"]/g, "")           // strip risky chars
    .trim()
    .slice(0, maxLen)
}

/** Validate an integer within a range */
export function sanitizeInt(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(input)
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, Math.floor(n)))
}

/** Validate a boolean */
export function sanitizeBool(input: unknown): boolean {
  if (typeof input === "boolean") return input
  if (input === "true" || input === "1") return true
  return false
}

// ── Platform validation ─────────────────────────────────────────────────────
const VALID_PLATFORMS = ["tiktok", "instagram", "youtube", "facebook", "twitter"] as const
type SocialPlatform = typeof VALID_PLATFORMS[number]

export function isValidPlatform(p: unknown): p is SocialPlatform {
  return typeof p === "string" && VALID_PLATFORMS.includes(p as SocialPlatform)
}

// ── JSON body size guard ────────────────────────────────────────────────────
/** Read request body but reject if too large (prevents DoS) */
export async function safeJson(req: Request, maxBytes = 10_000): Promise<any> {
  const contentLength = Number(req.headers.get("content-length") ?? "0")
  if (contentLength > maxBytes) return null
  try {
    const text = await req.text()
    if (text.length > maxBytes) return null
    return JSON.parse(text)
  } catch {
    return null
  }
}

// ── Suspicious pattern detection ───────────────────────────────────────────
const SUSPICIOUS_PATTERNS = [
  /[<>]/,                             // HTML injection
  /javascript:/i,                     // JS URL
  /on\w+\s*=/i,                       // event handler injection
  /union\s+select/i,                  // SQL injection
  /\.\.\//,                           // path traversal
  /__proto__/i,                       // prototype pollution
  /constructor\[/i,                   // prototype pollution
]

export function looksLikeAttack(input: string): boolean {
  return SUSPICIOUS_PATTERNS.some(p => p.test(input))
}
