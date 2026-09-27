import { z } from 'zod'

export const CHECKOUT_DRAFT_KEY = 'cbc.checkout-draft.v1'
const MAX_AGE = 90 * 24 * 60 * 60 * 1000
const text = z.string().max(1000)
const draftSchema = z.object({
  name: text, email: text, whatsapp: text,
  addr: z.object({ street: text, extNo: text, intNo: text, colonia: text, cp: text, city: text, state: text, references: text }),
  needsCfdi: z.boolean(),
  cfdi: z.object({ rfc: text, razonSocial: text, regimenFiscal: text, usoCfdi: text, cpFiscal: text }),
  isGift: z.boolean(), recipientName: text, giftMessage: text,
})
export type CheckoutDraft = z.infer<typeof draftSchema>

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (typeof saved.expiresAt !== 'number' || saved.expiresAt <= Date.now()) {
      localStorage.removeItem(CHECKOUT_DRAFT_KEY)
      return null
    }
    return draftSchema.parse(saved.data)
  } catch { return null }
}

export function saveCheckoutDraft(data: CheckoutDraft): boolean {
  try {
    localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify({ expiresAt: Date.now() + MAX_AGE, data: draftSchema.parse(data) }))
    return true
  } catch { return false }
}

export function removeCheckoutDraft(): boolean {
  try { localStorage.removeItem(CHECKOUT_DRAFT_KEY); return true } catch { return false }
}
