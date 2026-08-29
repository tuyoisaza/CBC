export const ALL_PERMISSIONS = [
  'dashboard:read',
  'sales:read',
  'sales:write',
  'service:read',
  'service:write',
  'users:read',
  'users:write',
  'roles:read',
  'roles:write',
  'audit:read',
  'ai:read',
  'settings:read',
  'settings:write',
  'debug:read',
  'system:read',
] as const

export type Permission = (typeof ALL_PERMISSIONS)[number]
