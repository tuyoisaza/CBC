import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { compare } from 'bcryptjs'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!

// The only Google accounts allowed into the admin. Overridable via
// ADMIN_EMAILS (comma-separated) without a code change.
const ALLOWED_EMAILS = (
  process.env.ADMIN_EMAILS || 'thetboard@gmail.com,lorela2114@gmail.com'
)
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

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
      if (user)    token.role = 'admin'
      if (account) token.provider = account.provider
      return token
    },

    async session({ session, token }) {
      session.user.role     = token.role     as string
      session.user.provider = token.provider as string
      return session
    },
  },
}
