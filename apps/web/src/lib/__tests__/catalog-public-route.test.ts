import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn() }))
vi.mock('next-auth/middleware', () => ({ withAuth: () => mocks.auth }))
import middleware from '../../../middleware'
beforeEach(() => { mocks.auth.mockReset(); mocks.auth.mockReturnValue(NextResponse.next()) })
it.each(['/catalogo-b2b', '/catalogo-b2b/extra/filtros', '/en/catalogo-b2b', '/en/catalogo-b2b/method/prensa', '/cotizar'])('allows anonymous browsing: %s', path => {
  expect(middleware(new NextRequest('http://localhost:3000' + path)).status).toBe(200)
  expect(mocks.auth).not.toHaveBeenCalled()
})
it('keeps admin routes behind authentication', () => {
  middleware(new NextRequest('http://localhost:3000/admin/sales/extras'))
  expect(mocks.auth).toHaveBeenCalledOnce()
})
