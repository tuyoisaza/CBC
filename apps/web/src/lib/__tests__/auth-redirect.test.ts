import { describe, expect, it } from 'vitest'
import { getAdminCallbackPath } from '../auth-redirect'

describe('admin login destination', () => {
  it('preserves configuration links across the public and login domains', () => {
    expect(getAdminCallbackPath('/admin/configuration')).toBe('/admin/configuration')
    expect(getAdminCallbackPath('https://coffeebunncafe.com/admin/configuration')).toBe('/admin/configuration')
    expect(getAdminCallbackPath('https://cbc-production-aaeb.up.railway.app/admin/configuration')).toBe('/admin/configuration')
  })
  it('never produces an external redirect or a non-admin destination', () => {
    for (const raw of [null, 'https://evil.example/', '//evil.example', 'javascript:alert(1)', '/admin/../api/admin/configuration']) {
      expect(getAdminCallbackPath(raw)).toBe('/admin/dashboard')
    }
    expect(getAdminCallbackPath('https://evil.example/admin/configuration')).toBe('/admin/configuration')
  })
})
