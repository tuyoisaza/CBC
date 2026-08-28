import { z } from 'zod'

export const langSchema = z.enum(['es', 'en'])
export const themeSchema = z.enum(['dark', 'light'])
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled'])
export const leadStatusSchema = z.enum(['new', 'contacted', 'quoted', 'won', 'lost'])
export const messageDirectionSchema = z.enum(['inbound', 'outbound'])
export const messageStatusSchema = z.enum(['unread', 'read', 'archived'])

export const emailSchema = z.string().email()
export const phoneSchema = z.string().min(10)
export const urlSchema = z.string().url()

export const leadFormSchema = z.object({
  name: z.string().min(1),
  email: emailSchema,
  phone: phoneSchema.optional(),
  company: z.string().optional(),
  message: z.string().optional(),
})

export const quoteFormSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1),
  methodId: z.string().optional(),
  extras: z.array(z.string()).optional(),
  shippingZoneId: z.string().optional(),
})
