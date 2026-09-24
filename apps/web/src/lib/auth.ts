import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

// The only Google accounts allowed into the admin. Overridable via
// ADMIN_EMAILS (comma-separated) without a code change.
export function superadminEmails() {
  return (process.env.SUPERADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
}

function allowedEmails() {
  return [...(process.env.ADMIN_EMAILS || 'thetboard@gmail.com,lorela2114@gmail.com').split(',').map(email => email.trim().toLowerCase()), ...superadminEmails()]
}

/**
 * Upserts the authenticated user into `User` and resolves their role.
 * New users default to the "admin" role if it exists.
 * Returns { userId, roleName }.
 */
export async function syncUser(input: { email: string; name?: string | null; image?: string | null }) {
    const email = input.email.trim().toLowerCase()
    const existing = await db.user.findUnique({ where: { email }, include: { role: true } })
    if (existing && !existing.active) throw new Error('Account is inactive')
    const bootstrapSuperadmin = superadminEmails().includes(email)
    const role = await db.role.findUnique({ where: { name: 'admin' } })

    const user = await db.user.upsert({
      where: { email },
      update: {
        name: input.name ?? undefined,
        image: input.image ?? undefined,
        ...(bootstrapSuperadmin ? { isSuperadmin: true } : {}),
      },
      create: {
        email,
        name: input.name,
        image: input.image,
        roleId: role?.id ?? undefined,
        isSuperadmin: bootstrapSuperadmin,
      },
      include: { role: true },
    })

    if (!user.active) throw new Error('Account is inactive')
    return { userId: user.id, roleName: user.role?.name?.toLowerCase() ?? '', isSuperadmin: user.isSuperadmin }
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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase()
        const googleProfile = profile as { email?: string; email_verified?: boolean } | undefined
        if (!email || !allowedEmails().includes(email) || googleProfile?.email_verified !== true || googleProfile.email?.toLowerCase() !== email) {
          // Reject — redirect to login with error
          return `/login?error=AccessDenied`
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      if (user?.email) {
        const { userId, roleName, isSuperadmin } = await syncUser({
          email: user.email,
          name: user.name,
          image: user.image,
        })
        token.dbUserId = userId
        token.role = roleName
        token.isSuperadmin = isSuperadmin
      } else {
        // Re-read on every server session lookup: deactivation and role changes
        // take effect without waiting for a long-lived JWT to expire.
        if (!token.dbUserId) throw new Error('Account identity unavailable')
        const current = await db.user.findUnique({ where: { id: token.dbUserId }, include: { role: true } })
        if (!current?.active || current.email.toLowerCase() !== token.email?.toLowerCase()) throw new Error('Account access revoked')
        token.role = current.role?.name.toLowerCase() ?? ''
        token.isSuperadmin = current.isSuperadmin
      }
      if (account) token.provider = account.provider
      return token
    },

    async session({ session, token }) {
      session.user.id       = (token.dbUserId as string) ?? undefined
      session.user.role     = (token.role as string) ?? ''
      session.user.isSuperadmin = token.isSuperadmin === true
      session.user.provider = (token.provider as string) ?? undefined
      return session
    },
  },
}
