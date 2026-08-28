export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
export type LeadStatus = 'new' | 'contacted' | 'quoted' | 'won' | 'lost'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'unread' | 'read' | 'archived'
export type Lang = 'es' | 'en'
export type Theme = 'dark' | 'light'

export interface NavItem {
  href: string
  label: string
  icon?: string
}

export interface ApiKeySetting {
  key: string
  label: string
  hint: string
  prefix: string
}

export interface HealthCheck {
  status: 'ok' | 'error' | 'not_configured'
  latency_ms: number
  message?: string
}

export interface DebugEntry {
  type: string
  args: unknown[]
  timestamp: string
}
