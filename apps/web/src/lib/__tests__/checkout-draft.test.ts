import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CHECKOUT_DRAFT_KEY, readCheckoutDraft } from '../checkout-draft'

beforeEach(() => localStorage.clear())

describe('checkout draft storage', () => {
  it('ignores corrupt and malformed saved data', () => {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, '{')
    expect(readCheckoutDraft()).toBeNull()
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ expiresAt: Date.now() + 1000, data: { name: 3 } }))
    expect(readCheckoutDraft()).toBeNull()
  })

  it('removes expired data', () => {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ expiresAt: Date.now() - 1, data: {} }))
    expect(readCheckoutDraft()).toBeNull()
    expect(localStorage.getItem(CHECKOUT_DRAFT_KEY)).toBeNull()
  })

  it('does not throw when storage is blocked', () => {
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked') })
    expect(readCheckoutDraft()).toBeNull()
    storage.mockRestore()
  })
})
