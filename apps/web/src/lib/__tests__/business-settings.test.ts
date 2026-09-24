import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ find: vi.fn(), list: vi.fn(), upsert: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'u1' } }) }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/superadmin', () => ({ requireAdminAccess: async () => null }))
vi.mock('@/lib/db', () => ({ db: { setting: { findUnique: mocks.find, findMany: mocks.list, upsert: mocks.upsert } } }))
import { GET, POST } from '@/app/api/admin/settings/route'
beforeEach(() => { vi.resetAllMocks(); mocks.list.mockResolvedValue([]); mocks.find.mockResolvedValue(null) })

describe('legacy business settings boundary', () => {
  it('rejects credentials and bootstrap settings on write and read', async () => {
    for (const key of ['STRIPE_SECRET_KEY', 'SUPERADMIN_EMAILS', 'NEXTAUTH_SECRET', 'integration:mercadopago', 'MERCADOPAGO_ACCESS_TOKEN']) {
      const response = await POST(new NextRequest('http://localhost/api/admin/settings', { method: 'POST', body: JSON.stringify({ key, value: 'secret' }) }))
      expect(response.status).toBe(400)
      expect((await GET(new NextRequest(`http://localhost/api/admin/settings?key=${key}`))).status).toBe(404)
    }
    expect(mocks.upsert).not.toHaveBeenCalled()
    expect(mocks.find).not.toHaveBeenCalled()
  })
  it('only lists whitelisted unencrypted rows', async () => {
    await GET(new NextRequest('http://localhost/api/admin/settings'))
    expect(mocks.list).toHaveBeenCalledWith({ where: { key: { in: expect.arrayContaining(['single_purchase_markup', 'payments_b2b_provider']) }, encrypted: false } })
  })
  it('does not read or overwrite an encrypted row even under a business key', async () => {
    mocks.find.mockResolvedValue({ key: 'single_purchase_markup', value: 'encrypted', encrypted: true })
    expect((await GET(new NextRequest('http://localhost/api/admin/settings?key=single_purchase_markup'))).status).toBe(404)
    expect((await POST(new NextRequest('http://localhost/api/admin/settings', { method: 'POST', body: JSON.stringify({ key: 'single_purchase_markup', value: '1' }) }))).status).toBe(403)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
