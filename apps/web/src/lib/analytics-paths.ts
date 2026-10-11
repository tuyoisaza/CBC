export const ANALYTICS_EXCLUDED_PATHS = ['/admin', '/login', '/api', '/health', '/tracking', '/en/tracking'] as const

export function isAnalyticsExcludedPath(path: string) {
  return ANALYTICS_EXCLUDED_PATHS.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))
}
