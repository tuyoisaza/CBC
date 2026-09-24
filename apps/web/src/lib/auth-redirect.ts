/** Preserve an admin deep link through sign-in, without accepting an external redirect. */
export function getAdminCallbackPath(raw: string | null): string {
  if (!raw) return '/admin/dashboard'
  try {
    const url = new URL(raw, 'https://cbc.invalid')
    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return url.pathname + url.search
  } catch { /* Invalid URLs return to the dashboard. */ }
  return '/admin/dashboard'
}
