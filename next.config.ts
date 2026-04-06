import type { NextConfig } from "next";

// All RapidAPI hosts used in the app
const RAPID_HOSTS = [
  "tiktok-scraper7.p.rapidapi.com",
  "instagram-api-fast-reliable-data-scraper.p.rapidapi.com",
  "twitter-api45.p.rapidapi.com",
  "youtube-v31.p.rapidapi.com",
  "facebook-scraper-api4.p.rapidapi.com",
  "mediacrawlers.p.rapidapi.com",
]

const contentSecurityPolicy = [
  "default-src 'self'",
  // Scripts: Next.js needs unsafe-inline/eval for HMR and hydration
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Styles: Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: CDN, social media avatars, thumbnails
  "img-src 'self' data: blob: https: http:",
  // API calls: own origin + all RapidAPI hosts + Whop
  `connect-src 'self' ${RAPID_HOSTS.map(h => `https://${h}`).join(" ")} https://api.whop.com wss:`,
  // Frames: only allow Whop to embed us
  "frame-ancestors https://whop.com https://*.whop.com 'self'",
  // No plugins
  "object-src 'none'",
  // Base URI restriction (prevents base-tag injection attacks)
  "base-uri 'self'",
  // Form submissions only to self
  "form-action 'self'",
].join("; ")

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // ── Content Security Policy ──────────────────────────────────────
          { key: "Content-Security-Policy", value: contentSecurityPolicy },

          // ── Prevent MIME sniffing (XSS vector) ──────────────────────────
          { key: "X-Content-Type-Options", value: "nosniff" },

          // ── Referrer leakage ─────────────────────────────────────────────
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

          // ── Permissions / Feature Policy ─────────────────────────────────
          // Disables camera, mic, geolocation, payment, USB
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },

          // ── Clickjacking (belt + suspenders with CSP frame-ancestors) ────
          // NOTE: Whop needs iframe embedding, so we can't use DENY globally.
          // CSP frame-ancestors already covers it, but we add SAMEORIGIN as fallback.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },

          // ── XSS filter (legacy browsers) ────────────────────────────────
          { key: "X-XSS-Protection", value: "1; mode=block" },

          // ── DNS prefetch control ─────────────────────────────────────────
          { key: "X-DNS-Prefetch-Control", value: "on" },

          // ── HSTS — force HTTPS ───────────────────────────────────────────
          // 2 years, includes subdomains
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // ── API routes — extra cache control ──────────────────────────────────
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ]
  },

  // ── Disable powered-by header (fingerprinting) ──────────────────────────────
  poweredByHeader: false,

  // ── Strict mode ──────────────────────────────────────────────────────────────
  reactStrictMode: true,
}

export default nextConfig
