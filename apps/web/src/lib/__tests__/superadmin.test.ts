import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ session: vi.fn(), user: vi.fn(), role: vi.fn(), upsert: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/db', () => ({ db: { user: { findUnique: mocks.user, upsert: mocks.upsert }, role: { findUnique: mocks.role } } }))
import { authOptions, syncUser } from '../auth'
import { requireSuperadmin, isSuperadminSession, requireAdminAccess } from '../superadmin'

const session = { user: { id: 'u1', email: 'admin@example.com', role: 'admin', provider: 'google', isSuperadmin: true }, expires: '2099-01-01' }
const ordinaryUser = { id: 'u1', email: 'admin@example.com', active: true, isSuperadmin: false, roleId: 'viewer', role: { name: 'viewer' } }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('SUPERADMIN_EMAILS', '')
  mocks.session.mockResolvedValue(session)
  mocks.user.mockResolvedValue(ordinaryUser)
  mocks.role.mockResolvedValue({ id: 'admin-role', name: 'admin' })
  mocks.upsert.mockResolvedValue(ordinaryUser)
})
afterEach(() => vi.unstubAllEnvs())

describe('superadmin authority', () => {
  it('requires a matching verified Google email before allowlisted sign-in can bootstrap', async () => {
    vi.stubEnv('SUPERADMIN_EMAILS', ordinaryUser.email)
    const signIn = authOptions.callbacks!.signIn as (args: any) => Promise<any>
    const args = { user: { email: ordinaryUser.email }, account: { provider: 'google' } }
    expect(await signIn({ ...args, profile: { email: ordinaryUser.email, email_verified: true } })).toBe(true)
    for (const profile of [undefined, { email: ordinaryUser.email, email_verified: false }, { email: 'other@example.com', email_verified: true }]) {
      expect(await signIn({ ...args, profile })).toBe('/login?error=AccessDenied')
    }
  })
  it('rejects a forged session flag and a role named superadmin without the database flag', async () => {
    mocks.user.mockResolvedValue({ ...ordinaryUser, role: { name: 'superadmin', permissions: ['*', 'superadmin'] } })
    await expect(requireSuperadmin()).rejects.toMatchObject({ status: 403 })
    expect(await isSuperadminSession(session)).toBe(false)
  })
  it('accepts only a fresh active database superadmin identity', async () => {
    mocks.user.mockResolvedValue({ ...ordinaryUser, isSuperadmin: true })
    await expect(requireSuperadmin()).resolves.toEqual({ id: 'u1', email: 'admin@example.com' })
    mocks.user.mockResolvedValue({ ...ordinaryUser, isSuperadmin: true, active: false })
    await expect(requireSuperadmin()).rejects.toMatchObject({ status: 403 })
  })
  it('fails closed for absent sessions and unavailable database', async () => {
    mocks.session.mockResolvedValue(null)
    await expect(requireSuperadmin()).rejects.toMatchObject({ status: 401 })
    mocks.session.mockResolvedValue(session)
    mocks.user.mockRejectedValue(new Error('DB down'))
    await expect(requireSuperadmin()).rejects.toMatchObject({ status: 503 })
    await expect(requireAdminAccess(session)).resolves.toMatchObject({ status: 503 })
  })
  it('preserves an existing role and does not promote ordinary sign-ins', async () => {
    await syncUser({ email: ordinaryUser.email })
    const args = mocks.upsert.mock.calls[0][0]
    expect(args.update).not.toHaveProperty('roleId')
    expect(args.update).not.toHaveProperty('isSuperadmin')
    expect(args.create.isSuperadmin).toBe(false)
  })
  it('bootstraps only explicit allowlisted email addresses', async () => {
    vi.stubEnv('SUPERADMIN_EMAILS', ' ADMIN@example.com ')
    await syncUser({ email: ordinaryUser.email })
    expect(mocks.upsert.mock.calls[0][0].update.isSuperadmin).toBe(true)
  })
  it('rejects inactive accounts and database failures without an admin fallback', async () => {
    mocks.user.mockResolvedValue({ ...ordinaryUser, active: false })
    await expect(syncUser({ email: ordinaryUser.email })).rejects.toThrow('inactive')
    expect(mocks.upsert).not.toHaveBeenCalled()
    mocks.user.mockRejectedValue(new Error('DB down'))
    await expect(syncUser({ email: ordinaryUser.email })).rejects.toThrow('DB down')
  })
  it('refreshes role and superadmin flag on existing sessions and denies deactivated users', async () => {
    const jwt = authOptions.callbacks!.jwt as (args: any) => Promise<any>
    const token = { dbUserId: 'u1', email: ordinaryUser.email, role: 'admin', isSuperadmin: true }
    await expect(jwt({ token })).resolves.toMatchObject({ role: 'viewer', isSuperadmin: false })
    mocks.user.mockResolvedValue({ ...ordinaryUser, active: false })
    await expect(jwt({ token })).rejects.toThrow('revoked')
  })
})
