/**
 * LinkedIn OAuth callback: code → access token (~60 days) → person URN via
 * /v2/userinfo → stored in Setting.social.linkedin.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setLinkedInCreds } from '@/lib/social'
import { createLogger } from '@/lib/logger'

const log = createLogger('auth/social/linkedin')

function backTo(req: NextRequest, params: string) {
  return NextResponse.redirect(new URL(`/admin/marketing/connections?${params}`, req.url))
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookieState = req.cookies.get('social_oauth_state')?.value

  if (!code) return backTo(req, `error=linkedin_denied`)
  if (!state || state !== cookieState) return backTo(req, `error=state_mismatch`)

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/linkedin/callback`

  try {
    // 1. code → access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })
    if (!tokenRes.ok) throw new Error(`token exchange: ${await tokenRes.text()}`)
    const { access_token: accessToken, expires_in: expiresIn } = await tokenRes.json()

    // 2. person URN + name
    const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!meRes.ok) throw new Error(`userinfo: ${await meRes.text()}`)
    const me = await meRes.json()

    await setLinkedInCreds({
      accessToken,
      authorUrn: `urn:li:person:${me.sub}`,
      name: me.name,
      connectedAt: new Date().toISOString(),
      expiresAt: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : undefined,
    })

    log.info({ urn: `urn:li:person:${me.sub}` }, 'LinkedIn connected')
    return backTo(req, `connected=linkedin`)
  } catch (err) {
    log.error({ error: err instanceof Error ? err.message : String(err) }, 'LinkedIn OAuth failed')
    return backTo(req, `error=linkedin_oauth_failed`)
  }
}
