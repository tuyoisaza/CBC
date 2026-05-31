/**
 * CBC Engine Client
 * The platform talks to cbc-engine (separate Railway service) via HTTP.
 * The engine reads current coffee from this platform's /api/coffee/current endpoint.
 * Posts are saved back to the platform's DB via /api/admin/posts.
 */

const ENGINE_URL = process.env.CBC_ENGINE_URL || 'http://localhost:3001'

async function engineFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-engine-token': process.env.ENGINE_SECRET_TOKEN || '',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Engine error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function getEngineHealth(): Promise<{
  status: string
  currentCoffee: string
  lastUpdated: string
  nextPosts: Array<{ type: string; at: string }>
}> {
  try {
    return await engineFetch('/health')
  } catch {
    return { status: 'offline', currentCoffee: '—', lastUpdated: '—', nextPosts: [] }
  }
}

export async function triggerPost(type: 'product-post' | 'coffee-story' | 'linkedin-post' | 'seasonal'): Promise<{
  instagram?: string
  facebook?: string
  linkedin?: string
  caption?: string
  imageUrl?: string
}> {
  return engineFetch(`/trigger/${type}`, { method: 'POST' })
}

export async function previewPost(type: string): Promise<{
  caption: string
  imageUrl: string
  imagePrompt: string
}> {
  return engineFetch('/preview', {
    method: 'POST',
    body: JSON.stringify({ type }),
  })
}

export async function updateEngineCoffee(coffee: Record<string, unknown>) {
  try {
    return await engineFetch('/config/coffee', {
      method: 'POST',
      body: JSON.stringify(coffee),
    })
  } catch (err) {
    // Engine offline — not fatal, coffee is in DB as source of truth
    console.warn('Engine coffee sync failed (engine may be offline):', err)
  }
}

export async function setEngineSchedule(schedule: Record<string, unknown>) {
  return engineFetch('/config/schedule', {
    method: 'POST',
    body: JSON.stringify(schedule),
  })
}
