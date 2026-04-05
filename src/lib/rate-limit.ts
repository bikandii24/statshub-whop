/**
 * In-memory rate limiter for serverless.
 * Resets per-instance but prevents burst attacks within the same warm function.
 * For full persistence, the Netlify Blobs approach would be needed, but this is lightweight and fast.
 */
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs }
  }

  record.count++
  if (record.count > maxAttempts) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now }
  }

  return { allowed: true, remaining: maxAttempts - record.count, resetIn: record.resetAt - now }
}

export function getClientIp(req: Request): string {
  const forwarded = (req.headers as any).get?.("x-forwarded-for") ?? ""
  const realIp    = (req.headers as any).get?.("x-real-ip") ?? ""
  const cfIp      = (req.headers as any).get?.("cf-connecting-ip") ?? ""
  return (cfIp || realIp || forwarded.split(",")[0] || "unknown").trim().slice(0, 64)
}

/** Standard security headers to add to every response */
export function securityHeaders(res: Response): Response {
  res.headers.set("X-Content-Type-Options", "nosniff")
  res.headers.set("X-Frame-Options", "DENY")
  res.headers.set("X-XSS-Protection", "1; mode=block")
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  return res
}
