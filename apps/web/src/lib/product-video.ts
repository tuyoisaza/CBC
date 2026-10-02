export type ProductVideoPlatform = 'youtube' | 'instagram'

export interface ProductVideoEmbed {
  platform: ProductVideoPlatform
  embedUrl: string
  videoId: string
}

export function getProductVideoEmbed(rawUrl: string): ProductVideoEmbed | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) {
    let videoId = ''
    if (host === 'youtu.be') videoId = url.pathname.split('/').filter(Boolean)[0] ?? ''
    else videoId = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)?.[1] ?? ''
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null
    return { platform: 'youtube', videoId, embedUrl: `https://www.youtube.com/embed/${videoId}` }
  }

  if (['instagram.com', 'm.instagram.com'].includes(host)) {
    const match = url.pathname.match(/^\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/)
    if (!match) return null
    const videoId = match[1]
    return { platform: 'instagram', videoId, embedUrl: `https://www.instagram.com/${url.pathname.split('/').filter(Boolean)[0]}/${videoId}/embed/` }
  }

  return null
}
