import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ updateMany: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'admin' } }) }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({ db: { message: { updateMany: mocks.updateMany } } }))
vi.mock('@/lib/integration-secrets', () => ({ getIntegrationValues: vi.fn() }))

import { DELETE } from '@/app/api/admin/messages/route'

describe('message soft delete', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.updateMany.mockResolvedValue({ count: 1 }) })

  it('sets deletedAt only for a read or replied inbound message', async () => {
    const response = await DELETE(new NextRequest('http://localhost/api/admin/messages?id=message-1', { method: 'DELETE' }))
    expect(response.status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: 'message-1', direction: 'inbound', deletedAt: null, status: { in: ['read', 'replied'] } },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('does not pretend a missing or unread message was deleted', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 })
    const response = await DELETE(new NextRequest('http://localhost/api/admin/messages?id=message-1', { method: 'DELETE' }))
    expect(response.status).toBe(404)
  })
})
