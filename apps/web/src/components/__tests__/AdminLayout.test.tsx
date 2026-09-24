import React from 'react'
import { describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ elevated: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: async () => ({ user: { id: 'u1', isSuperadmin: true } }) }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/superadmin', () => ({ requireAdminAccess: async () => null, isSuperadminSession: mocks.elevated }))
vi.mock('@/components/admin/AdminNav', () => ({ AdminNav: () => null }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
import AdminLayout from '@/app/admin/(protected)/layout'

describe('AdminLayout navigation authority', () => {
  it.each([true, false])('passes fresh superadmin=%s to navigation, not the cached session flag', async elevated => {
    mocks.elevated.mockResolvedValue(elevated)
    const layout = await AdminLayout({ children: React.createElement('p', null, 'Content') })
    const nav = layout.props.children[0]
    expect(nav.props.isSuperadmin).toBe(elevated)
    expect(mocks.elevated).toHaveBeenCalled()
  })
})
