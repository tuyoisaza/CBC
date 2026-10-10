// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  findMany: vi.fn(),
  transaction: vi.fn(),
  txFindMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  auditCreate: vi.fn(),
}))

vi.mock('@/lib/superadmin', () => ({
  requireSuperadmin: mocks.guard,
  SuperadminAccessError: class extends Error { constructor(public readonly status: 401 | 403 | 503) { super('private authorization detail') } },
}))
vi.mock('@/lib/db', () => ({
  db: {
    setting: { findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}))

import { SuperadminAccessError } from '@/lib/superadmin'
import { GET, PUT } from './route'

const actor = { id: 'superadmin-1', email: 'admin@example.com' }
const request = (body: unknown, origin = 'https://cbc.example') => new NextRequest('https://cbc.example/api/admin/configuration/analytics', {
  method: 'PUT',
  headers: { origin, 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('NEXTAUTH_URL', 'https://cbc.example')
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
  vi.stubEnv('NEXT_PUBLIC_ADMIN_URL', '')
  mocks.guard.mockResolvedValue(actor)
  mocks.findMany.mockResolvedValue([])
  mocks.txFindMany.mockResolvedValue([])
  mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    setting: { findMany: mocks.txFindMany, upsert: mocks.upsert, deleteMany: mocks.deleteMany },
    auditLog: { create: mocks.auditCreate },
  }))
})
afterEach(() => { vi.unstubAllEnvs() })

describe('superadmin analytics configuration boundary', () => {
  it.each([401, 403, 503] as const)('rejects reads and writes when fresh superadmin authorization fails with %s', async status => {
    mocks.guard.mockRejectedValue(new SuperadminAccessError(status))
    expect((await GET()).status).toBe(status)
    expect((await PUT(request({ googleMeasurementId: 'G-EXAMPLE123', clarityProjectId: 'project123' }))).status).toBe(status)
    expect(mocks.findMany).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('returns only the two validated public IDs to an authorized superadmin', async () => {
    mocks.findMany.mockResolvedValue([
      { key: 'analytics_google_measurement_id', value: 'G-EXAMPLE123', encrypted: false },
      { key: 'analytics_clarity_project_id', value: 'clarity123', encrypted: false },
      { key: 'site_logo_url', value: 'https://cbc.example/logo.png', encrypted: false },
    ])
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.json()).toEqual({ googleMeasurementId: 'G-EXAMPLE123', clarityProjectId: 'clarity123' })
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { key: { in: ['analytics_google_measurement_id', 'analytics_clarity_project_id'] } } })
  })

  it('validates exact ID formats before touching storage', async () => {
    const response = await PUT(request({ googleMeasurementId: 'G-invalid!', clarityProjectId: 'project123' }))
    expect(response.status).toBe(400)
    expect(await response.text()).not.toContain('G-invalid!')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('saves changed IDs and records an audit event without storing values in audit metadata', async () => {
    mocks.txFindMany.mockResolvedValue([{ key: 'analytics_google_measurement_id', value: 'G-OLD123', encrypted: false }])
    const response = await PUT(request({ googleMeasurementId: 'G-NEW123', clarityProjectId: 'clarity123' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.upsert).toHaveBeenCalledTimes(2)
    expect(mocks.auditCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'update',
      entity: 'settings',
      entityId: 'website-analytics',
      metadata: { changed: ['googleMeasurementId', 'clarityProjectId'] },
    }) })
    expect(JSON.stringify(mocks.auditCreate.mock.calls)).not.toContain('G-NEW123')
    expect(JSON.stringify(mocks.auditCreate.mock.calls)).not.toContain('clarity123')
  })

  it('removes a cleared ID instead of persisting an empty value', async () => {
    mocks.txFindMany.mockResolvedValue([
      { key: 'analytics_google_measurement_id', value: 'G-OLD123', encrypted: false },
      { key: 'analytics_clarity_project_id', value: 'clarity123', encrypted: false },
    ])
    const response = await PUT(request({ googleMeasurementId: '', clarityProjectId: '' }))
    expect(response.status).toBe(200)
    expect(mocks.deleteMany).toHaveBeenCalledTimes(2)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('rejects writes from an untrusted origin without changing settings', async () => {
    const response = await PUT(request({ googleMeasurementId: 'G-EXAMPLE123', clarityProjectId: '' }, 'https://evil.example'))
    expect(response.status).toBe(403)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
