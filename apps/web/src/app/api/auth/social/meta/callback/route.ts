/**
 * Meta OAuth callback: code → user token → long-lived token → first page's
 * page token + Instagram business account → stored in Setting.social.meta.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setMetaCreds } from '@/lib/social'
import { createLogger } from '@/lib/logger'

const log = createLogger('auth/social/meta')
const GRAPH = 'https://graph.facebook.com/v21.0'

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

  if (!code) return backTo(req, `error=meta_denied`)
  if (!state || state !== cookieState) return backTo(req, `error=state_mismatch`)

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/meta/callback`

  try {
    // 1. code → short-lived user token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`
    )
    if (!tokenRes.ok) throw new Error(`token exchange: ${await tokenRes.text()}`)
    const { access_token: shortToken } = await tokenRes.json()

    // 2. short-lived → long-lived user token
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    )
    if (!longRes.ok) throw new Error(`long-lived exchange: ${await longRes.text()}`)
    const { access_token: longToken } = await longRes.json()

    // 3. pages the user manages (page tokens derived from a long-lived user
    //    token do not expire)
    const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token&access_token=${longToken}`)
    if (!pagesRes.ok) throw new Error(`pages: ${await pagesRes.text()}`)
    const pages = (await pagesRes.json()).data as Array<{ id: string; name: string; access_token: string }>
    if (!pages?.length) return backTo(req, `error=no_pages`)
    const page = pages[0]

    // 4. the page's Instagram business account, if linked
    let igAccountId: string | undefined
    let igUsername: string | undefined
    try {
      const igRes = await fetch(
        `${GRAPH}/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`
      )
      const ig = (await igRes.json()).instagram_business_account
      igAccountId = ig?.id
      igUsername = ig?.username
    } catch {
      // no IG linked — Facebook-only is still valid
    }

    await setMetaCreds({
      pageId: page.id,
      pageName: page.name,
      pageToken: page.access_token,
      igAccountId,
      igUsername,
      connectedAt: new Date().toISOString(),
    })

    log.info({ pageId: page.id, ig: igUsername || null }, 'Meta connected')
    return backTo(req, `connected=meta`)
  } catch (err) {
    log.error({ error: err instanceof Error ? err.message : String(err) }, 'Meta OAuth failed')
    return backTo(req, `error=meta_oauth_failed`)
  }
}
