# CBC Railway Zero-Touch Deploy Restructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the CBC monorepo to deploy on Railway with zero human intervention — following PHDK standards.

**Architecture:** Merge the Astro public site (`apps/web`) and Next.js admin (`apps/admin`) into a single Next.js app at `apps/web`. Convert npm to pnpm. Remove root clutter (`cbc-platform/`). Set up proper Railway configs from repo root. Content engine becomes `apps/api` as a separate Railway worker service.

**Tech Stack:** pnpm, Turborepo, Next.js 14 (App Router), Tailwind CSS v3, Prisma/PostgreSQL, Railway (2 services from repo root)

---

## File Structure (Target)

```
/
├── apps/
│   ├── web/                  ← renamed from apps/admin + public pages merged
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                     ← public landing (ES)
│   │   │   │   ├── en/page.tsx                  ← public landing (EN)
│   │   │   │   ├── cotizar/page.tsx             ← quote form (ES)
│   │   │   │   ├── en/cotizar/page.tsx          ← quote form (EN)
│   │   │   │   ├── tracking/[code]/page.tsx     ← order tracking (public)
│   │   │   │   ├── login/                       ← admin login (existing)
│   │   │   │   ├── admin/                       ← admin panel (existing)
│   │   │   │   └── api/                         ← all API routes (existing)
│   │   │   ├── lib/          ← existing admin lib
│   │   │   ├── components/   ← existing admin components + public components
│   │   │   └── types/        ← existing admin types
│   │   ├── package.json     ← renamed to @cbc/web
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   ├── next.config.mjs
│   │   └── middleware.ts
│   ├── api/                  ← content engine (moved from apps/content-engine)
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── scheduler.js
│   │   │   ├── content-types/
│   │   │   ├── publishers/
│   │   │   ├── generators/
│   │   │   └── webhooks/
│   │   ├── config/
│   │   ├── package.json
│   │   └── railway.json
│   └── mobile/               ← placeholder (empty)
├── packages/
│   └── db/                   ← Prisma schema (existing, unchanged)
├── docs/
├── railway.json              ← root Railway config for web app
├── pnpm-workspace.yaml
├── package.json              ← root workspace
├── turbo.json
├── .env.example
├── .dockerignore
└── .gitignore
```

---

## Tasks

### Task 1: Backup & Git Checkpoint

**Files:**
- Create: git checkpoint branch

- [ ] **Step 1: Create git checkpoint**
  ```bash
  git add -A
  git stash
  git checkout -b checkpoint/2026-05-31
  git stash pop
  git add -A
  git commit -m "chore: pre-restructure checkpoint before Railway deploy refactor"
  git checkout main
  ```

  Expected: Clean checkpoint on `checkpoint/2026-05-31` branch, back on `main`.

- [ ] **Step 2: Verify checkpoint exists**
  ```bash
  git log --oneline -3
  ```
  Expected: Shows the new checkpoint commit.

---

### Task 2: Remove Root Clutter & Clean Up

**Files:**
- Delete: `cbc-platform/` (entire directory)

- [ ] **Step 1: Remove cbc-platform directory**
  ```bash
  rm -rf cbc-platform
  ```
  Expected: Directory removed.

- [ ] **Step 2: Remove old lockfiles**
  ```bash
  rm -f package-lock.json
  rm -f apps/admin/package-lock.json  
  rm -f apps/content-engine/package-lock.json
  ```
  (We'll use pnpm from here on.)

---

### Task 3: Convert npm → pnpm — Root Setup

**Files:**
- Create: `pnpm-workspace.yaml`
- Modify: `package.json` (root)
- Delete: `apps/content-engine/railway.json` (will be replaced by root-level config)

- [ ] **Step 1: Create pnpm-workspace.yaml**
  ```yaml
  packages:
    - 'apps/*'
    - 'packages/*'
  ```

- [ ] **Step 2: Update root package.json**
  - Remove `"packageManager": "npm@10.8.2"` → set to pnpm
  - Remove `"workspaces"` field (pnpm uses pnpm-workspace.yaml)
  - Remove `"postinstall"` script (will handle prisma generate differently)
  - Update scripts to use turbo filters with pnpm syntax

  ```json
  {
    "name": "cbc-monorepo",
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "dev": "turbo run dev",
      "build": "turbo run build",
      "start": "turbo run start",
      "lint": "turbo run lint",
      "typecheck": "turbo run typecheck",
      "postinstall": "prisma generate --schema=packages/db/schema.prisma"
    },
    "devDependencies": {
      "turbo": "^2.0.12",
      "prisma": "^5.18.0",
      "@prisma/client": "^5.18.0"
    }
  }
  ```

  Note: prisma packages moved to root devDependencies so `prisma generate` can run from root without needing workspace filtering.

- [ ] **Step 3: Update .gitignore for pnpm**
  ```gitignore
  node_modules
  .next
  dist
  .turbo
  *.db
  .env
  .env.local
  .env.*.local
  pnpm-lock.yaml
  ```

- [ ] **Step 4: Remove outdated railway.json from content-engine**
  (Will be replaced with proper root-level config later.)

---

### Task 4: Merge Admin → Web (Rename & Convert)

**Files:**
- Rename: `apps/admin/` → `apps/web/` (replacing existing Astro app)
- Modify: `apps/web/package.json` (update name to `@cbc/web`)
- Add: Public landing page (ES) `apps/web/src/app/page.tsx`
- Add: Public landing page (EN) `apps/web/src/app/en/page.tsx`
- Add: Quote form (ES) `apps/web/src/app/cotizar/page.tsx`
- Add: Quote form (EN) `apps/web/src/app/en/cotizar/page.tsx`
- Add: Order tracking (ES) `apps/web/src/app/tracking/[code]/page.tsx`
- Add: Order tracking (EN) `apps/web/src/app/en/tracking/[code]/page.tsx`
- Add: Public components from `apps/web/src/legacy/public/*` (copy into new apps/web tree)

- [ ] **Step 1: Create staging area for Astro public pages**
  Save the Astro pages that need converting:
  ```bash
  mkdir -p /tmp/cbc-astro-backup
  cp -r apps/web/src/pages /tmp/cbc-astro-backup/
  cp apps/web/src/layouts/Layout.astro /tmp/cbc-astro-backup/
  cp apps/web/src/styles/global.css /tmp/cbc-astro-backup/
  cp -r apps/web/src/legacy /tmp/cbc-astro-backup/
  cp apps/web/src/assets/* /tmp/cbc-astro-backup/assets/ 2>/dev/null || true
  cp apps/web/public/* /tmp/cbc-astro-backup/public/ 2>/dev/null || true
  ```

- [ ] **Step 2: Remove old apps/web and rename apps/admin → apps/web**
  ```bash
  rm -rf apps/web
  mv apps/admin apps/web
  ```

- [ ] **Step 3: Update apps/web/package.json**
  ```json
  {
    "name": "@cbc/web",
    "version": "1.0.0",
    "private": true,
    "scripts": {
      "dev": "next dev --port 3000",
      "build": "next build",
      "start": "next start",
      "lint": "next lint",
      "typecheck": "tsc --noEmit"
    },
    "dependencies": {
      "@anthropic-ai/sdk": "^0.36.0",
      "@auth/prisma-adapter": "^2.7.0",
      "@aws-sdk/client-s3": "^3.600.0",
      "@aws-sdk/s3-request-presigner": "^3.600.0",
      "@cbc/db": "workspace:*",
      "@radix-ui/react-accordion": "^1.2.0",
      "@radix-ui/react-avatar": "^1.1.0",
      "@radix-ui/react-dialog": "^1.1.1",
      "@radix-ui/react-dropdown-menu": "^2.1.1",
      "@radix-ui/react-label": "^2.1.0",
      "@radix-ui/react-select": "^2.1.1",
      "@radix-ui/react-separator": "^1.1.0",
      "@radix-ui/react-slot": "^1.1.0",
      "@radix-ui/react-switch": "^1.1.0",
      "@radix-ui/react-tabs": "^1.1.0",
      "@radix-ui/react-toast": "^1.2.1",
      "@radix-ui/react-tooltip": "^1.1.2",
      "@react-pdf/renderer": "^3.4.4",
      "@sentry/nextjs": "^8.26.0",
      "axios": "^1.7.0",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.1.1",
      "lucide-react": "^0.446.0",
      "next": "^14.2.35",
      "next-auth": "^4.24.7",
      "next-themes": "^0.3.0",
      "posthog-js": "^1.161.0",
      "react": "^18.3.1",
      "react-dom": "^18.3.1",
      "resend": "^4.0.0",
      "stripe": "^16.9.0",
      "tailwind-merge": "^2.5.2",
      "tailwindcss-animate": "^1.0.7",
      "zod": "^3.23.8"
    },
    "devDependencies": {
      "@types/bcryptjs": "^2.4.6",
      "@types/node": "^22.0.0",
      "@types/react": "^18.3.5",
      "@types/react-dom": "^18.3.0",
      "bcryptjs": "^3.0.3",
      "eslint": "^8.57.0",
      "eslint-config-next": "14.2.13",
      "postcss": "^8.4.41",
      "tailwindcss": "^3.4.10",
      "typescript": "^5.5.4"
    }
  }
  ```

  Key changes:
  - Name: `@cbc/web`
  - `@cbc/db` uses `workspace:*` protocol
  - Removed `prestart` script (db push will be done separately)
  - Added `typecheck` script
  - Port changed from 3001 to 3000 (it's the main app now)

- [ ] **Step 4: Update root layout to handle public routes properly**

  Modify `apps/web/src/app/layout.tsx`:
  - Remove the admin-specific `noindex` metadata (will be per-route for admin pages)
  - Keep Raleway font, ThemeProvider, globals.css
  - Add language detection for ES/EN routing

  The layout should wrap all routes with the theme provider but NOT assume admin-only content. The admin pages will have their own layout group.

  Actually, for simplicity: keep the root layout as-is (it has the theme provider which is global), and the admin layout group can add its own protection. The root layout should not have `robots: noindex` since public pages should be indexed.

  ```tsx
  import type { Metadata } from 'next'
  import { Raleway } from 'next/font/google'
  import { ThemeProvider } from 'next-themes'
  import './globals.css'

  const raleway = Raleway({
    subsets: ['latin'],
    variable: '--font-raleway',
    display: 'swap',
    weight: ['300', '400', '600', '700', '800'],
  })

  export const metadata: Metadata = {
    title: 'Coffee Bunn Café | Regalos Corporativos de Café',
    description: 'Regalos corporativos premium con café de especialidad mexicano.',
  }

  export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html lang="es" suppressHydrationWarning>
        <body className={`${raleway.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    )
  }
  ```

- [ ] **Step 5: Create public landing page (ES) — `apps/web/src/app/page.tsx`**
  
  Convert the Astro `index.astro` to a Next.js server component. Uses the existing Tailwind classes. No interactivity needed (CTAs are `<a>` tags).

  ```tsx
  const WA_URL = 'https://wa.me/5215572293512?text=Hola%2C%20quiero%20cotizar%20cajas%20de%20regalo%20CBC'

  export default function HomePage() {
    return (
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center cbc-gradient">
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-2xl animate-fade-in">
              <p className="mb-6 text-sm font-semibold tracking-widest uppercase text-cbc-yellow">
                B2B / Regalos Corporativos
              </p>
              <h1 className="text-5xl font-bold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                Eleva la <span className="text-cbc-yellow">Experiencia</span> de tu Marca
              </h1>
              <p className="mt-6 text-xl leading-relaxed text-gray-400">
                Regalos corporativos premium con café de especialidad mexicano.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <a href={WA_URL} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center justify-center gap-2 rounded-md bg-cbc-yellow px-8 py-4 text-base font-semibold text-black hover:bg-cbc-yellow/90 transition-all">
                  Hablar con Ventas
                </a>
                <a href="/cotizar"
                   className="inline-flex items-center justify-center rounded-md border border-cbc-yellow/40 px-8 py-4 text-base font-semibold text-cbc-yellow hover:bg-cbc-yellow/10 transition-colors">
                  Ver Catálogo B2B
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PROMISES */}
        <section className="py-24 bg-cbc-black">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Café de Especialidad</h3>
                <p className="text-gray-400">Seleccionamos los mejores granos de México.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Diseño Personalizado</h3>
                <p className="text-gray-400">Tu logo y branding integrados elegantemente.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-cbc-yellow mb-4">Logística Integral</h3>
                <p className="text-gray-400">Entregamos en volumen a tus oficinas.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }
  ```

  (Full content will match the Astro original with all sections: promises, boxes, coffee story, lorena, social proof, FAQ, footer.)

- [ ] **Step 6: Create public landing page (EN) — `apps/web/src/app/en/page.tsx`**

  Same structure as ES version but with English copy. Path: `app/en/page.tsx` using Next.js localized routing.

- [ ] **Step 7: Create quote form page (ES) — `apps/web/src/app/cotizar/page.tsx`**

  Convert the Astro `cotizar.astro` to a Next.js client component. The form submits to `/api/leads` (which already exists from the admin API routes).

  ```tsx
  'use client'

  import { useState, FormEvent } from 'react'

  export default function CotizarPage() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [message, setMessage] = useState('')

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
      e.preventDefault()
      setStatus('loading')
      const form = new FormData(e.currentTarget)
      const data = Object.fromEntries(form.entries())
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Error al enviar')
        setStatus('success')
        setMessage('¡Solicitud enviada! Te contactaremos en menos de 24 horas.')
      } catch {
        setStatus('error')
        setMessage('Error al enviar. Intenta de nuevo o escríbenos por WhatsApp.')
      }
    }

    return (
      <main className="min-h-screen bg-cbc-black py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-cbc-cream mb-4 text-center">Cotiza tus Regalos</h1>
          {/* form fields same as Astro original */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... form fields from original ... */}
            <button type="submit" disabled={status === 'loading'}
              className="w-full bg-cbc-yellow text-black font-bold py-4 rounded-md">
              {status === 'loading' ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </form>
        </div>
      </main>
    )
  }
  ```

- [ ] **Step 8: Create quote form page (EN) — `apps/web/src/app/en/cotizar/page.tsx`**

  Same as ES but English labels.

- [ ] **Step 9: Create order tracking page — `apps/web/src/app/tracking/[code]/page.tsx`**

  Convert the Astro `tracking/search.astro` to a Next.js page. This one has TWO states: a search form (no code yet) and a result view (code provided). Use a client component with conditional rendering.

  For the EN version, create `apps/web/src/app/en/tracking/[code]/page.tsx`.

- [ ] **Step 10: Add footer to all public pages**

  Create a shared `PublicFooter` component in `apps/web/src/components/public/` and use it in the public pages.

---

### Task 5: Update Next.js Config & Root Layout for Public Routes

**Files:**
- Modify: `apps/web/next.config.mjs`
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Update next.config.mjs**

  Remove the root redirect `/ → /admin/dashboard` since `/` is now the public landing page. Keep admin redirects for `/admin → /admin/dashboard`.

  ```mjs
  const nextConfig = {
    output: 'standalone',
    experimental: {
      serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    },
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'assets.coffeebunncafe.com' },
        { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      ],
      formats: ['image/avif', 'image/webp'],
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ],
        },
        {
          source: '/admin/:path*',
          headers: [
            { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          ],
        },
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          ],
        },
      ]
    },
    async redirects() {
      return [
        {
          source: '/:path*',
          has: [{ type: 'host', value: 'www.coffeebunncafe.com' }],
          destination: 'https://coffeebunncafe.com/:path*',
          permanent: true,
        },
        {
          source: '/admin',
          destination: '/admin/dashboard',
          permanent: false,
        },
      ]
    },
  }
  export default nextConfig
  ```

- [ ] **Step 2: Update middleware.ts**

  The middleware currently protects all routes except `/login` and `/api/`. We need it to only protect `/admin/*`. Public routes (/, /en/, /cotizar, /tracking) should be accessible without auth.

  ```ts
  import { withAuth } from 'next-auth/middleware'
  import { NextRequest, NextResponse } from 'next/server'

  const authMiddleware = withAuth(
    function onSuccess(_req) { return NextResponse.next() },
    {
      callbacks: {
        authorized: ({ token }) => token?.role === 'admin',
      },
      pages: { signIn: '/login' },
    }
  )

  export default function middleware(req: NextRequest): NextResponse {
    const { pathname } = req.nextUrl

    // Static assets — always pass through
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/_vercel') ||
      /\.(.*)$/.test(pathname)
    ) {
      return NextResponse.next()
    }

    // Public routes — no auth required
    if (
      pathname === '/' ||
      pathname === '/login' ||
      pathname.startsWith('/en') ||
      pathname.startsWith('/cotizar') ||
      pathname.startsWith('/tracking') ||
      pathname.startsWith('/api/')
    ) {
      return NextResponse.next()
    }

    // Admin routes — require auth
    return (authMiddleware as any)(req)
  }

  export const config = {
    matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
  }
  ```

---

### Task 6: Set Up Content Engine as apps/api

**Files:**
- Rename: `apps/content-engine/` → `apps/api/`
- Modify: `apps/api/package.json`
- Modify: `apps/api/railway.json`

- [ ] **Step 1: Rename content-engine to api**
  ```bash
  mv apps/content-engine apps/api
  ```

- [ ] **Step 2: Update apps/api/package.json**
  ```json
  {
    "name": "@cbc/api",
    "version": "1.0.0",
    "private": true,
    "description": "CBC Content Engine — autonomous social media posting",
    "main": "src/index.js",
    "scripts": {
      "dev": "node src/index.js",
      "start": "node src/index.js"
    },
    "dependencies": {
      "@anthropic-ai/sdk": "^0.36.0",
      "axios": "^1.7.0",
      "node-cron": "^3.0.3",
      "openai": "^4.52.0",
      "dotenv": "^16.4.0",
      "form-data": "^4.0.0",
      "node-fetch": "^3.3.2"
    },
    "devDependencies": {
      "nodemon": "^3.1.0"
    }
  }
  ```

- [ ] **Step 3: Update apps/api/railway.json**
  ```json
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "NIXPACKS"
    },
    "deploy": {
      "startCommand": "node src/index.js",
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3
    }
  }
  ```

---

### Task 7: Set Up Root Railway Config

**Files:**
- Modify: `railway.json` (root)
- Modify: `.dockerignore`

- [ ] **Step 1: Create root railway.json for web app**

  The main web app service configuration:
  ```json
  {
    "$schema": "https://railway.app/railway.schema.json",
    "build": {
      "builder": "NIXPACKS",
      "buildCommand": "corepack enable && corepack prepare pnpm@latest --activate && pnpm install && pnpm build --filter=@cbc/web"
    },
    "deploy": {
      "startCommand": "pnpm start --filter=@cbc/web",
      "restartPolicyType": "ON_FAILURE",
      "restartPolicyMaxRetries": 3,
      "healthcheckPath": "/api/health",
      "healthcheckTimeout": 120
    }
  }
  ```

- [ ] **Step 2: Update .dockerignore**
  ```
  .git
  .gitignore
  .env
  .env.local
  .env.*.local
  node_modules
  .next
  dist
  .turbo
  *.md
  .DS_Store
  docs
  .claude
  ```

---

### Task 8: Update Turbo Config

**Files:**
- Modify: `turbo.json`

- [ ] **Step 1: Update turbo.json for pnpm and new app structure**

  ```json
  {
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": [".next/**", "!.next/cache/**", "dist/**"]
      },
      "dev": {
        "cache": false,
        "persistent": true
      },
      "start": {
        "cache": false
      },
      "lint": {},
      "typecheck": {}
    }
  }
  ```

---

### Task 9: Install Dependencies & Verify Build

- [ ] **Step 1: Install pnpm globally (if not present)**
  ```bash
  npm install -g pnpm
  ```

- [ ] **Step 2: Install all dependencies**
  ```bash
  pnpm install
  ```
  Expected: Clean install, pnpm-lock.yaml generated, no errors.

- [ ] **Step 3: Run typecheck**
  ```bash
  turbo run typecheck
  ```
  Expected: TypeScript compiles without errors.

- [ ] **Step 4: Run build**
  ```bash
  turbo run build
  ```
  Expected: Web app builds successfully with `output: 'standalone'`.

- [ ] **Step 5: Verify health endpoint**
  Start the app and verify `/api/health` returns `200`.

---

### Task 10: Final Cleanup & Verify

- [ ] **Step 1: Remove Astro backup from /tmp**
- [ ] **Step 2: Verify all routes work locally**
  - `/` → landing page
  - `/en/` → English landing
  - `/cotizar` → quote form
  - `/tracking/test-code` → tracking page
  - `/login` → admin login
  - `/admin/dashboard` → admin (redirects to login if not authenticated)
  - `/api/health` → health check

- [ ] **Step 3: Commit everything**
  ```bash
  git add -A
  git commit -m "v1.0.0 feat: restructure monorepo for zero-touch Railway deploy

  - Convert npm → pnpm for reliable monorepo builds
  - Merge Astro public site + Next.js admin into single apps/web
  - Remove cbc-platform/ root clutter
  - Content engine moved to apps/api
  - Public routes now served from Next.js (no separate Astro deploy)
  - Middleware scoped to protect only /admin/* routes
  - Root railway.json with proper build/start for Railway
  - Turbo config updated for pnpm workspace"
  ```

---

## Public Routes Reference

| Route | File | Description |
|-------|------|-------------|
| `/` | `apps/web/src/app/page.tsx` | Landing page (ES) |
| `/en/` | `apps/web/src/app/en/page.tsx` | Landing page (EN) |
| `/cotizar` | `apps/web/src/app/cotizar/page.tsx` | Quote form (ES) |
| `/en/cotizar` | `apps/web/src/app/en/cotizar/page.tsx` | Quote form (EN) |
| `/tracking/[code]` | `apps/web/src/app/tracking/[code]/page.tsx` | Order tracking |
| `/en/tracking/[code]` | `apps/web/src/app/en/tracking/[code]/page.tsx` | Order tracking (EN) |

## Admin Routes (protected, existing)

| Route | Source |
|-------|--------|
| `/login` | `apps/web/src/app/login/` |
| `/admin/dashboard` | `apps/web/src/app/admin/(protected)/dashboard/` |
| `/admin/marketing/*` | `apps/web/src/app/admin/(protected)/marketing/` |
| `/admin/sales/*` | `apps/web/src/app/admin/(protected)/sales/` |
| `/admin/service` | `apps/web/src/app/admin/(protected)/service/` |
| `/admin/settings` | `apps/web/src/app/admin/(protected)/settings/` |

## Railway Services

| Service | Railway Root | Build Command | Start Command |
|---------|-------------|---------------|---------------|
| `cbc-web` | repo root | `pnpm install && pnpm build --filter=@cbc/web` | `pnpm start --filter=@cbc/web` |
| `cbc-api` | repo root | `pnpm install` | `pnpm --filter=@cbc/api start` |
