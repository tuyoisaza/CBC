import { execSync } from 'child_process'

// Auto-detect version from git tag so NEXT_PUBLIC_APP_VERSION stays in sync
function getVersion() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim()
  } catch {
    // Railway does shallow clones without tags — fetch them and retry
    try {
      execSync('git fetch --tags --depth=1 origin main 2>/dev/null', { encoding: 'utf-8' })
      return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim()
    } catch {
      return process.env.NEXT_PUBLIC_APP_VERSION || '?'
    }
  }
}
process.env.NEXT_PUBLIC_APP_VERSION = getVersion()

const nextConfig = {
  // ─── Server-side external packages (Next.js 14 syntax) ──────────────────
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },

  // ─── Images ───────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coffeebunncafe.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // ─── Security headers ─────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://app.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://assets.coffeebunncafe.com https://www.coffeebunncafe.com",
              "connect-src 'self' https://api.stripe.com https://app.posthog.com https://o*.ingest.sentry.io",
              "frame-src https://js.stripe.com",
            ].join('; '),
          },
        ],
      },
      // CORS for API routes
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://coffeebunncafe.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // No-index admin routes
      {
        source: '/admin/(.*)',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },

  // ─── Redirects ────────────────────────────────────────────────────
  async redirects() {
    return [
      // www → bare domain (permanent)
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.coffeebunncafe.com' }],
        destination: 'https://coffeebunncafe.com/:path*',
        permanent: true,
      },
      // /admin → /admin/dashboard
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
