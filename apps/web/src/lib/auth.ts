import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

// The only Google accounts allowed into the admin. Overridable via
// ADMIN_EMAILS (comma-separated) without a code change.
const ALLOWED_EMAILS = (
  process.env.ADMIN_EMAILS || 'thetboard@gmail.com,lorela2114@gmail.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

/**
 * Upserts the authenticated user into `User` and resolves their role.
 * New users default to the "admin" role if it exists.
 * Returns { userId, roleName }.
 */
async function syncUser(input: { email: string; name?: string | null; image?: string | null }) {
  try {
    const role = await db.role.findUnique({ where: { name: 'admin' } })

    const user = await db.user.upsert({
      where: { email: input.email.toLowerCase() },
      update: {
        name: input.name ?? undefined,
        image: input.image ?? undefined,
        roleId: role?.id ?? undefined,
      },
      create: {
        email: input.email.toLowerCase(),
        name: input.name,
        image: input.image,
        roleId: role?.id ?? undefined,
      },
      include: { role: true },
    })

    return { userId: user.id, roleName: user.role?.name?.toLowerCase() ?? null }
  } catch {
    // Sign-in must never break when the DB is unavailable (cold start /
    // migration pending) — fall back to a safe default role.
    return { userId: null, roleName: 'admin' }
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    // ─── Google OAuth ────────────────────────────────────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Force account picker every time — prevents wrong account slipping through
          prompt: 'select_account',
          access_type: 'online',
          response_type: 'code',
        },
      },
    }),

    // ─── Email + Password (fallback) ─────────────────────────────
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const adminHash = process.env.ADMIN_PASSWORD_HASH
        if (!adminHash) return null
        if (credentials.email !== ADMIN_EMAIL) return null

        const isValid = await compare(credentials.password, adminHash)
        if (!isValid) return null

        return { id: 'admin', email: ADMIN_EMAIL, name: 'CBC Admin' }
      },
    }),
  ],

  callbacks: {
    // ─── Block any Google account not on the allowlist ───────────
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase()
        if (!email || !ALLOWED_EMAILS.includes(email)) {
          // Reject — redirect to login with error
          return `/login?error=AccessDenied`
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      if (user?.email) {
        const { userId, roleName } = await syncUser({
          email: user.email,
          name: user.name,
          image: user.image,
        })
        token.dbUserId = userId
        token.role = roleName ?? token.role
      }
      if (account) token.provider = account.provider
      return token
    },

    async session({ session, token }) {
      session.user.id       = (token.dbUserId as string) ?? undefined
      session.user.role     = (token.role as string) ?? 'admin'
      session.user.provider = (token.provider as string) ?? undefined
      return session
    },
  },
}
