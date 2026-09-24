import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ user: vi.fn(), update: vi.fn(), remove: vi.fn(), create: vi.fn(), role: vi.fn(), roleUpdate: vi.fn(), roleCreate: vi.fn(), count: vi.fn(), elevated: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'actor', email: 'ordinary@example.com', role: 'admin' } }) }))
vi.mock('@/lib/auth', () => ({ authOptions: {}, superadminEmails: () => ['owner@example.com'] }))
vi.mock('@/lib/superadmin', () => ({ requireAdminAccess: async () => null, isSuperadminSession: mocks.elevated }))
vi.mock('@/lib/db', () => ({ db: {
  user: { findUnique: mocks.user, update: mocks.update, delete: mocks.remove, create: mocks.create, count: mocks.count },
  role: { findUnique: mocks.role, update: mocks.roleUpdate, create: mocks.roleCreate },
} }))
vi.mock('@/lib/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }))
vi.mock('@/lib/audit', () => ({ recordAudit: vi.fn() }))
import { PATCH as patchUser, DELETE as deleteUser } from '@/app/api/admin/users/[id]/route'
import { POST as createUser } from '@/app/api/admin/users/route'
import { PATCH as patchRole } from '@/app/api/admin/roles/[id]/route'
import { POST as createRole } from '@/app/api/admin/roles/route'

const request = (body: unknown) => new NextRequest('http://localhost/api/admin/users', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.elevated.mockResolvedValue(false)
  mocks.user.mockResolvedValue({ id: 'target', email: 'someone@example.com', isSuperadmin: false })
  mocks.role.mockResolvedValue({ id: 'role1', name: 'operator' })
  mocks.count.mockResolvedValue(0)
})

describe('generic access management cannot escalate superadmin', () => {
  it('rejects direct flag injection', async () => {
    expect((await createUser(request({ email: 'someone@example.com', isSuperadmin: true }))).status).toBe(400)
    expect((await patchUser(request({ isSuperadmin: true }), { params: { id: 'target' } })).status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('blocks editing and deleting a superadmin by an ordinary admin', async () => {
    mocks.user.mockResolvedValue({ id: 'target', email: 'owner@example.com', isSuperadmin: true })
    expect((await patchUser(request({ active: false }), { params: { id: 'target' } })).status).toBe(403)
    expect((await deleteUser(request({}), { params: { id: 'target' } })).status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('blocks claiming an allowlisted bootstrap email', async () => {
    expect((await createUser(request({ email: 'owner@example.com' }))).status).toBe(403)
    expect((await patchUser(request({ email: 'owner@example.com' }), { params: { id: 'target' } })).status).toBe(403)
  })
  it('reserves the superadmin role name and disallows invented permissions', async () => {
    expect((await createRole(request({ name: ' SuperAdmin ' }))).status).toBe(400)
    expect((await createRole(request({ name: 'custom', permissions: ['superadmin'] }))).status).toBe(400)
    expect((await patchRole(request({ name: 'superadmin' }), { params: { id: 'role1' } })).status).toBe(400)
    expect(mocks.roleCreate).not.toHaveBeenCalled()
  })
  it('blocks indirect changes to a role assigned to a superadmin', async () => {
    mocks.count.mockResolvedValue(1)
    expect((await patchRole(request({ name: 'operator2' }), { params: { id: 'role1' } })).status).toBe(403)
    expect(mocks.roleUpdate).not.toHaveBeenCalled()
  })
})
